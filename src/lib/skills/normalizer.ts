import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type CanonicalSkill = {
  id: string;
  canonical_name: string;
  category: string;
};

export type MatchType = "exact" | "alias" | "normalized" | "none";

export type NormalizationResult = {
  raw: string;
  canonical: CanonicalSkill | null;
  match_type: MatchType;
};

export type TaxonomyIndex = {
  byCanonical: Map<string, CanonicalSkill>; // lowercased canonical_name
  byAlias: Map<string, CanonicalSkill>;     // lowercased alias
  byNormalized: Map<string, CanonicalSkill>; // punctuation-stripped, whitespace-collapsed
  loadedAt: number;
};

// Singleton in-process cache with 10-minute TTL
let cachedIndex: TaxonomyIndex | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

// Strips punctuation, collapses whitespace, lowercases.
// "react.js" → "reactjs"  |  "AWS Lambda" → "awslambda"
export function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export async function getTaxonomyIndex(): Promise<TaxonomyIndex> {
  const now = Date.now();
  if (cachedIndex && now - cachedIndex.loadedAt < CACHE_TTL_MS) {
    return cachedIndex;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("skills_taxonomy")
    .select("id, canonical_name, category, aliases");

  if (error) throw new Error(`Failed to load taxonomy index: ${error.message}`);

  const byCanonical = new Map<string, CanonicalSkill>();
  const byAlias = new Map<string, CanonicalSkill>();
  const byNormalized = new Map<string, CanonicalSkill>();

  for (const row of data ?? []) {
    const skill: CanonicalSkill = {
      id: row.id,
      canonical_name: row.canonical_name,
      category: row.category,
    };

    const lowerCanonical = row.canonical_name.toLowerCase().trim();
    byCanonical.set(lowerCanonical, skill);

    const normCanonical = normalizeString(row.canonical_name);
    if (normCanonical && !byNormalized.has(normCanonical)) {
      byNormalized.set(normCanonical, skill);
    }

    for (const alias of row.aliases ?? []) {
      const lowerAlias = alias.toLowerCase().trim();
      if (lowerAlias && !byAlias.has(lowerAlias)) {
        byAlias.set(lowerAlias, skill);
      }
      const normAlias = normalizeString(alias);
      if (normAlias && !byNormalized.has(normAlias)) {
        byNormalized.set(normAlias, skill);
      }
    }
  }

  cachedIndex = { byCanonical, byAlias, byNormalized, loadedAt: now };
  return cachedIndex;
}

// Invalidate the in-process cache (call after seeding new taxonomy data)
export function invalidateTaxonomyCache(): void {
  cachedIndex = null;
}

export function normalizeSkill(raw: string, index: TaxonomyIndex): NormalizationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { raw, canonical: null, match_type: "none" };

  const lower = trimmed.toLowerCase();

  // Tier 1: exact canonical name match
  const exactCanonical = index.byCanonical.get(lower);
  if (exactCanonical) return { raw, canonical: exactCanonical, match_type: "exact" };

  // Tier 2: exact alias match
  const exactAlias = index.byAlias.get(lower);
  if (exactAlias) return { raw, canonical: exactAlias, match_type: "alias" };

  // Tier 3: normalized match (strips punctuation/spaces)
  const norm = normalizeString(trimmed);
  const normalized = index.byNormalized.get(norm);
  if (normalized) return { raw, canonical: normalized, match_type: "normalized" };

  return { raw, canonical: null, match_type: "none" };
}

export function normalizeSkills(raws: string[], index: TaxonomyIndex): NormalizationResult[] {
  return raws.map((r) => normalizeSkill(r, index));
}

// Log unknown skills to the database for taxonomy maintenance.
// Uses admin client since unknown_skills has no RLS.
export async function logUnknownSkills(
  unknowns: string[],
  source: "cv" | "job_listing"
): Promise<void> {
  if (unknowns.length === 0) return;

  try {
    const admin = createAdminClient();
    for (const raw of unknowns) {
      const lower = raw.toLowerCase().trim();
      if (!lower) continue;
      // log_unknown_skill atomically inserts or increments occurrence_count
      await admin.rpc("log_unknown_skill", { skill_text: lower, skill_source: source });
    }
  } catch (err) {
    // Non-critical — don't let logging failures affect the main flow
    logger.error("Failed to log unknown skills", { source, count: unknowns.length }, err);
  }
}
