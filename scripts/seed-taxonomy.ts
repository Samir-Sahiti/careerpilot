/**
 * Seed the skills_taxonomy table from data/skills-taxonomy.json.
 * Idempotent: second run updates aliases without duplicating rows.
 *
 * Usage: npm run seed:taxonomy
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local — Next.js does this automatically but plain tsx doesn't
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* rely on actual env vars */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface TaxonomyEntry {
  canonical_name: string;
  category: string;
  aliases: string[];
  description?: string;
}

interface TaxonomyFile {
  version: string;
  skills: TaxonomyEntry[];
}

async function main() {
  const jsonPath = path.join(process.cwd(), "data", "skills-taxonomy.json");

  if (!fs.existsSync(jsonPath)) {
    console.error(`Taxonomy file not found: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const taxonomy: TaxonomyFile = JSON.parse(raw);

  console.log(`Seeding ${taxonomy.skills.length} skills (version ${taxonomy.version})...`);

  const VALID_CATEGORIES = new Set([
    "language", "framework", "database", "cloud", "devops", "tool", "concept", "domain", "soft",
  ]);

  const invalid = taxonomy.skills.filter((s) => !VALID_CATEGORIES.has(s.category));
  if (invalid.length > 0) {
    console.error(`Invalid categories found: ${invalid.map((s) => `${s.canonical_name}(${s.category})`).join(", ")}`);
    process.exit(1);
  }

  const BATCH_SIZE = 50;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < taxonomy.skills.length; i += BATCH_SIZE) {
    const batch = taxonomy.skills.slice(i, i + BATCH_SIZE);

    const rows = batch.map((s) => ({
      canonical_name: s.canonical_name,
      category: s.category,
      aliases: s.aliases ?? [],
      description: s.description ?? null,
    }));

    const { data, error } = await supabase
      .from("skills_taxonomy")
      .upsert(rows, {
        onConflict: "canonical_name",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      const count = data?.length ?? 0;
      inserted += count;
    }
  }

  // Mark unknown_skills as resolved where they now match taxonomy entries
  const { error: resolveError } = await supabase.rpc("resolve_known_unknowns").maybeSingle();
  if (resolveError) {
    // Non-critical: the RPC may not exist yet
  }

  console.log(`\nSeed complete:`);
  console.log(`  Upserted: ${inserted}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${taxonomy.skills.length}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
