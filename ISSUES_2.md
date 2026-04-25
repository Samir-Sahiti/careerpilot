# CareerOS — Issues Sprint 2: Skill Graph Layer

> **Goal:** Replace the ad-hoc `string[]` skill model with a normalized taxonomy that powers fit scoring, roadmap auto-completion, cohort analysis, and rejection post-mortems with structured matching instead of string equality.
>
> **Scope:** Internal architecture only. **No new UI.** Users should not see anything new — they should just notice that recommendations get sharper. This is intentional: it's an upgrade to the spine of the product, not a feature.
>
> **Timeline:** ~1 week if focused. Issues are sequenced — earlier ones unblock later ones.

**Legend**
- **Complexity:** S (≤1 day), M (2–5 days), L (1–2 weeks)
- **Depends on:** issues that must ship first

---

## Why this exists

Every skill in CareerOS today is a free-form string. `cv.skills` is `["Python", "AWS", "React"]`. A job listing parses to `["python 3", "aws lambda", "react.js"]`. Matching is whatever string equality the AI happens to produce in its prompt context.

This works until it doesn't:
- Roadmap auto-completion (T2-4) currently can't match "Kubernetes" in a new CV against "K8s" in the original roadmap.
- Cohort comparisons (T2-5) can't say "you're missing 3 of the top 5 skills your cohort has" — there is no canonical "top 5."
- Fit scoring relies on the AI to do its own fuzzy matching every call, which is non-deterministic and unauditable.
- The same listing analyzed twice can produce different `matched_skills` lists.

A typed taxonomy fixes all four with one architectural change.

---

## SG-1 — Build and seed the skill taxonomy

**Complexity:** M · **Depends on:** —

### Why
Everything else needs a canonical list to map against. Without this, normalization has nothing to normalize *to*.

### What
- New `skills_taxonomy` table holding ~500 curated skills with aliases.
- Initial taxonomy generated via a one-time script using Claude, reviewed manually, committed as a JSON file in the repo.
- A SQL seed loads from that JSON.
- Treat the taxonomy as code: it lives in the repo, ships in PRs, has an owner.

### Schema (add to `schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS skills_taxonomy (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name  TEXT        NOT NULL UNIQUE,
  category        TEXT        NOT NULL,  -- see categories below
  aliases         TEXT[]      NOT NULL DEFAULT '{}',
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast alias lookup
CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_aliases
  ON skills_taxonomy USING GIN (aliases);

CREATE INDEX IF NOT EXISTS idx_skills_taxonomy_canonical_lower
  ON skills_taxonomy ((LOWER(canonical_name)));
```

**Categories (closed set, enforce via app-layer validation):**
- `language` — Python, TypeScript, Go, Rust, etc.
- `framework` — React, Django, Spring, etc.
- `database` — PostgreSQL, MongoDB, Redis, etc.
- `cloud` — AWS, GCP, Azure (and AWS Lambda, S3, etc. as their own entries)
- `devops` — Docker, Kubernetes, Terraform, CI/CD systems
- `tool` — Git, Jira, Figma, etc.
- `concept` — distributed systems, REST, GraphQL, microservices, etc.
- `domain` — fintech, healthtech, e-commerce, etc.
- `soft` — leadership, mentoring, written communication, etc.

### Bootstrap workflow

1. Write a script `scripts/generate-taxonomy.ts` that prompts Claude with each category and asks for ~50 canonical skills + aliases per category. Run it once.
2. Output: `data/skills-taxonomy.json` — committed to the repo.
3. Manually review and edit the JSON. Watch for: stale technologies, missing common aliases (e.g. "JS" for JavaScript, "PG" for PostgreSQL), category misclassification.
4. Write `scripts/seed-taxonomy.ts` that reads the JSON and upserts into `skills_taxonomy`. Idempotent — re-running updates aliases without duplicating rows.

### JSON shape
```json
{
  "version": "1.0.0",
  "skills": [
    {
      "canonical_name": "TypeScript",
      "category": "language",
      "aliases": ["ts", "typescript"],
      "description": "Statically-typed superset of JavaScript"
    },
    {
      "canonical_name": "Kubernetes",
      "category": "devops",
      "aliases": ["k8s", "kube"],
      "description": "Container orchestration platform"
    }
  ]
}
```

### Acceptance criteria
- [ ] `skills_taxonomy` table created, idempotent migration.
- [ ] `data/skills-taxonomy.json` exists in repo with ≥500 entries across all 9 categories.
- [ ] Every skill has at least the canonical name; high-frequency ones (top 100) have ≥2 aliases.
- [ ] Seed script runs idempotently — second run does not create duplicates and *does* update aliases if the JSON has changed.
- [ ] No RLS needed (this table is global, not user-scoped). Document this explicitly in the schema comment.
- [ ] Add a `npm run seed:taxonomy` script in package.json.

### Files to touch
- `schema.sql`
- `scripts/generate-taxonomy.ts` (new, run once)
- `scripts/seed-taxonomy.ts` (new, runnable any time)
- `data/skills-taxonomy.json` (new, committed)
- `package.json`
- `CLAUDE.md` (document the taxonomy as a first-class concept)

---

## SG-2 — Skill normalizer service

**Complexity:** M · **Depends on:** SG-1

### Why
A pure function that takes a raw string ("aws lambda functions") and returns either a canonical skill ID or `null` (unknown). This is the workhorse — every other issue calls it.

### What
A deterministic lookup with a tiered match strategy. **No AI in the hot path** — that would be slow, expensive, and non-deterministic. AI is used only at parse time when we already have Claude in the loop anyway.

### Match strategy (in order, first hit wins)

1. **Exact match** on `canonical_name` (case-insensitive, trimmed).
2. **Exact match** on any entry in `aliases` (case-insensitive, trimmed).
3. **Normalized match** — strip punctuation, collapse whitespace, lowercase. So `"react.js"` → `"reactjs"` matches an alias `"reactjs"`.
4. **Token-prefix match** for compound skills — `"AWS Lambda"` matches if the taxonomy has `"AWS Lambda"`; `"Lambda"` alone does not (avoid false positives).

If all four fail, return `null` and log to `unknown_skills` (SG-7).

### Implementation

```ts
// src/lib/skills/normalizer.ts

export type CanonicalSkill = {
  id: string;
  canonical_name: string;
  category: string;
};

export type NormalizationResult = {
  raw: string;
  canonical: CanonicalSkill | null;
  match_type: "exact" | "alias" | "normalized" | "none";
};

export async function normalizeSkill(
  raw: string,
  taxonomy: TaxonomyIndex
): Promise<NormalizationResult> { /* ... */ }

export async function normalizeSkills(
  raws: string[],
  taxonomy: TaxonomyIndex
): Promise<NormalizationResult[]> { /* ... */ }
```

### Performance

Build a single in-memory `TaxonomyIndex` at server startup (or lazily on first call). The taxonomy is small (~500 rows × ~3 aliases each = ~2000 lookup keys). A `Map<string, CanonicalSkill>` keyed on lowercased alias/canonical works fine.

Cache the index — refresh only when the taxonomy version changes (track in `skills_taxonomy.version` or via a separate `taxonomy_meta` table).

### Acceptance criteria
- [ ] `src/lib/skills/normalizer.ts` exports `normalizeSkill` and `normalizeSkills`.
- [ ] Lookup is O(1) per skill (in-memory Map).
- [ ] Index is built once and cached, with cache-bust mechanism.
- [ ] Unit tests cover all four match strategies plus the no-match case.
- [ ] Test fixtures: 30+ representative inputs ("react.js", "AWS", "k8s", "Postgresql", "node.js", "next.js 14", "amazon web services") with expected canonical names.
- [ ] Returns `match_type` so downstream code can log/inspect which path matched.

### Files to touch
- `src/lib/skills/normalizer.ts` (new)
- `src/lib/skills/__tests__/normalizer.test.ts` (new)
- `src/lib/skills/index.ts` (new — public export surface)

---

## SG-3 — Wire normalizer into CV parsing

**Complexity:** M · **Depends on:** SG-2

### Why
The CV is the source of truth for what a user has. Every downstream feature reads from `cvs.parsed_data`. If skills there aren't normalized, nothing else can be.

### What
After `buildCvParsePrompt` returns, normalize every skill in `parsed_data.skills`. Persist normalized links in a new junction table. Keep the original strings in `parsed_data.skills` for display.

### Schema

```sql
CREATE TABLE IF NOT EXISTS cv_skills (
  cv_id           UUID        NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  skill_id        UUID        NOT NULL REFERENCES skills_taxonomy(id) ON DELETE CASCADE,
  raw_text        TEXT        NOT NULL,  -- the original string from the CV
  match_type      TEXT        NOT NULL,  -- 'exact' | 'alias' | 'normalized'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cv_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_cv_skills_skill ON cv_skills(skill_id);

ALTER TABLE cv_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access their own cv_skills" ON cv_skills;
CREATE POLICY "Users access their own cv_skills"
  ON cv_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cvs WHERE cvs.id = cv_skills.cv_id AND cvs.user_id = auth.uid()
    )
  );
```

### Integration

In `src/app/api/cv/parse/route.ts`, after the existing parse step:

```ts
const taxonomy = await getTaxonomyIndex();
const results = await normalizeSkills(parsedData.skills, taxonomy);

const matched = results.filter(r => r.canonical !== null);
const unknown = results.filter(r => r.canonical === null);

await supabase.from("cv_skills").insert(
  matched.map(r => ({
    cv_id: cvId,
    skill_id: r.canonical!.id,
    raw_text: r.raw,
    match_type: r.match_type,
  }))
);

// SG-7 will handle unknown[]
```

### Acceptance criteria
- [ ] `cv_skills` table created with RLS policy via parent CV.
- [ ] CV parse route normalizes and persists skill links after parse succeeds.
- [ ] Original `parsed_data.skills` string array preserved unchanged.
- [ ] Re-parsing a CV (e.g. retry) does not duplicate rows — use `upsert` or `delete + insert` within a transaction.
- [ ] Failure to normalize a single skill does not fail the whole parse — log and continue.
- [ ] Add a small log line: "Parsed CV X — normalized 24/27 skills (3 unknown)".

### Files to touch
- `schema.sql`
- `src/app/api/cv/parse/route.ts`
- `src/lib/skills/index.ts`

---

## SG-4 — Wire normalizer into job analysis

**Complexity:** M · **Depends on:** SG-2

### Why
Same logic on the other side: the listing is the source of truth for what the role wants. Without normalized listing skills, fit-score matching is still string-based.

### What
After `buildJobAnalysisPrompt` returns, normalize `matched_skills` and `missing_skills`. Persist into a junction table.

Note that for job analyses, we want to distinguish *required* vs *preferred* skills. The current prompt doesn't do this explicitly — extend it.

### Prompt change

In `buildJobAnalysisPrompt`, change the output requirement from:
```
4. matched_skills: candidate skills that directly match the role
5. missing_skills: required skills the candidate lacks
```

to:
```
4. matched_skills: array of objects { name: string, importance: 'required' | 'preferred' }
5. missing_skills: array of objects { name: string, importance: 'required' | 'preferred' }
```

Update the Zod schema accordingly. Existing callers continue to work because we extract `name` for display.

### Schema

```sql
CREATE TABLE IF NOT EXISTS job_analysis_skills (
  job_analysis_id UUID        NOT NULL REFERENCES job_analyses(id) ON DELETE CASCADE,
  skill_id        UUID        NOT NULL REFERENCES skills_taxonomy(id) ON DELETE CASCADE,
  raw_text        TEXT        NOT NULL,
  is_required     BOOLEAN     NOT NULL,
  is_matched      BOOLEAN     NOT NULL,  -- true = candidate has it, false = gap
  match_type      TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_analysis_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_analysis_skills_skill
  ON job_analysis_skills(skill_id);

ALTER TABLE job_analysis_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access their own job_analysis_skills" ON job_analysis_skills;
CREATE POLICY "Users access their own job_analysis_skills"
  ON job_analysis_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM job_analyses
      WHERE job_analyses.id = job_analysis_skills.job_analysis_id
        AND job_analyses.user_id = auth.uid()
    )
  );
```

### Acceptance criteria
- [ ] `buildJobAnalysisPrompt` updated to require importance per skill.
- [ ] Zod schema in `src/lib/validation/schemas.ts` updated.
- [ ] `job_analysis_skills` table created with RLS via parent.
- [ ] Job analyze route normalizes both lists and persists.
- [ ] Display layer pulls from `matched_skills` strings as before — no UI change required for this issue.
- [ ] Backward compat: existing rows in `job_analyses` continue to render. New ones populate the junction table additionally.

### Files to touch
- `schema.sql`
- `src/lib/ai/prompts.ts`
- `src/lib/validation/schemas.ts`
- `src/types/index.ts`
- `src/app/api/jobs/analyze/route.ts`

---

## SG-5 — Roadmap auto-completion via normalized IDs

**Complexity:** M · **Depends on:** SG-3

### Why
T2-4 shipped CV-diff auto-completion against `roadmap_items`, but matching was string-based (per the audit, "the diff logic is not yet wired"). With normalized skill IDs on `cv_skills` and on `roadmap_items.title`, this becomes a clean SQL join.

### What
Add a `skill_id` column to `roadmap_items` (nullable — only items of type `skill` populate it). At item creation time, normalize the title against the taxonomy. On every CV upload, run a single SQL query: any roadmap item whose `skill_id` now appears in `cv_skills` for that user gets auto-marked done.

### Schema

```sql
ALTER TABLE roadmap_items
  ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills_taxonomy(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_items_skill ON roadmap_items(skill_id);
```

### Auto-completion query

After a CV parse completes (SG-3), run:

```sql
UPDATE roadmap_items
SET status = 'done',
    completed_at = NOW(),
    auto_completed_by_cv_id = $1
WHERE user_id = $2
  AND item_type = 'skill'
  AND status != 'done'
  AND skill_id IS NOT NULL
  AND skill_id IN (
    SELECT skill_id FROM cv_skills WHERE cv_id = $1
  );
```

Return the count and surface as a toast: "3 roadmap items auto-completed from your new CV."

### Acceptance criteria
- [ ] `roadmap_items.skill_id` column added.
- [ ] When a roadmap is generated (or items created), skill-type items get their title normalized and `skill_id` populated where possible.
- [ ] CV parse route triggers auto-completion query after writing `cv_skills`.
- [ ] Auto-completion is idempotent — running it twice does not change anything.
- [ ] Toast notification fires with count when auto-completions happen.
- [ ] Existing roadmaps work without the column populated (graceful degradation).

### Files to touch
- `schema.sql`
- `src/app/api/career/roadmap/route.ts` (populate skill_id on creation)
- `src/app/api/cv/parse/route.ts` (trigger auto-completion after parse)
- `src/lib/skills/autoComplete.ts` (new, the query)
- `src/components/cv/*` (toast on parse completion)

---

## SG-6 — Surface skill-graph signals in fit scoring

**Complexity:** M · **Depends on:** SG-3, SG-4

### Why
Today the fit-score prompt re-derives matched/missing on every call from raw strings. Now that we have authoritative normalized skill data on both sides (CV and listing), we can pre-compute matches deterministically and pass them into the prompt as ground truth — instead of asking Claude to do its own fuzzy matching from scratch.

This makes scores more consistent across calls *and* lets us reduce prompt tokens.

### What
Before calling Claude in `/api/jobs/analyze`:

1. Normalize the listing text → set of canonical skill IDs (using a lightweight extraction pass — see below).
2. Look up the user's `cv_skills` → set of canonical skill IDs.
3. Compute `matched = listing ∩ cv`, `missing = listing − cv`.
4. Pass these *as ground truth* to the prompt instead of asking Claude to derive them.

### Listing skill extraction

For step 1, two options:
- **(A) Cheap:** scan the listing text for any taxonomy alias/canonical match. Fast, deterministic, but misses skills phrased unusually ("experience with cloud").
- **(B) AI-augmented:** keep Claude in the loop for extraction, but constrain it: "extract skills from this listing, choosing only from this list of canonical names: [...]." Pass the taxonomy as part of the prompt.

**Recommend (B)** — Claude is already in the call; the marginal cost is small; recall is much higher. Cap the taxonomy list passed to Claude to the top 200 most common skills (smaller prompt, covers ~95% of listings).

### Prompt change

`buildJobAnalysisPrompt` currently asks the model to produce `matched_skills` and `missing_skills`. After this change, those fields are **inputs** to the prompt, not outputs:

```
GROUND TRUTH (computed deterministically from the candidate's profile and the listing):
- Matched skills: [TypeScript, React, PostgreSQL]
- Missing required skills: [Kubernetes, gRPC]
- Missing preferred skills: [Rust]

Do NOT change these lists. Use them to inform your fit_score, recommendation, and rationale.
```

Claude still produces `fit_score`, `recommendation`, `recommendation_reason`, `cv_suggestions`, `salary_estimate`, `fit_score_basis`, `fit_score_rationale` — the *qualitative* parts. The skill matching is no longer its job.

### Acceptance criteria
- [ ] `buildJobAnalysisPrompt` updated: `matched_skills` and `missing_skills` are inputs, not outputs.
- [ ] Pre-extraction step runs before the main prompt (using approach B above).
- [ ] Output schema in `src/lib/validation/schemas.ts` updated to remove these fields from the AI output.
- [ ] DB row population continues to write to `job_analyses.matched_skills` / `missing_skills` from the deterministic computation.
- [ ] Run regression: 10 sample listings before/after, confirm scores are stable or more consistent.
- [ ] Document this change prominently in `CLAUDE.md` — it's a meaningful architectural shift.

### Files to touch
- `src/lib/ai/prompts.ts`
- `src/lib/validation/schemas.ts`
- `src/app/api/jobs/analyze/route.ts`
- `src/lib/skills/extractFromListing.ts` (new)
- `CLAUDE.md`

---

## SG-7 — Track unknown skills + maintenance flow

**Complexity:** S · **Depends on:** SG-3, SG-4

### Why
A taxonomy that doesn't grow rots. Every parse and every analysis will encounter skills not in the taxonomy. Without tracking, you don't know what you're missing.

### What
Log every unknown skill (skill string that didn't normalize) with its source and frequency. Add a tiny admin route to review the top N most-frequent unknowns and add them to the taxonomy.

### Schema

```sql
CREATE TABLE IF NOT EXISTS unknown_skills (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text_lower    TEXT        NOT NULL UNIQUE,
  source            TEXT        NOT NULL,  -- 'cv' | 'job_listing'
  occurrence_count  INTEGER     NOT NULL DEFAULT 1,
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,                       -- set when added to taxonomy
  resolved_skill_id UUID REFERENCES skills_taxonomy(id)
);

CREATE INDEX IF NOT EXISTS idx_unknown_skills_unresolved
  ON unknown_skills(occurrence_count DESC) WHERE resolved_at IS NULL;
```

### Behavior

When a skill fails to normalize:
```sql
INSERT INTO unknown_skills (raw_text_lower, source) VALUES (LOWER($1), $2)
ON CONFLICT (raw_text_lower) DO UPDATE
  SET occurrence_count = unknown_skills.occurrence_count + 1,
      last_seen = NOW();
```

### Maintenance script

`scripts/review-unknowns.ts` — fetches top 50 unresolved unknowns by frequency, prints them. You eyeball, decide which to add to the taxonomy JSON, re-run `npm run seed:taxonomy`, then mark them resolved.

### Acceptance criteria
- [ ] `unknown_skills` table created. No RLS — system table, accessed only via admin client.
- [ ] CV parse and job analyze routes log unknowns via the admin client.
- [ ] `scripts/review-unknowns.ts` lists top unresolved.
- [ ] When a new skill is added to the taxonomy and seeded, a follow-up step marks any matching unknowns as `resolved_at = NOW()`.
- [ ] Document the maintenance loop in `CLAUDE.md`: "Once a week, run review-unknowns, edit the taxonomy JSON, re-seed."

### Files to touch
- `schema.sql`
- `src/lib/skills/normalizer.ts` (logging hook)
- `src/app/api/cv/parse/route.ts`
- `src/app/api/jobs/analyze/route.ts`
- `scripts/review-unknowns.ts` (new)
- `CLAUDE.md`

---

## Suggested ordering

**Day 1–2** — SG-1 (taxonomy schema + seed). Single biggest unblocker. Make sure JSON is reviewed by hand, not just AI-generated.

**Day 3** — SG-2 (normalizer service). Pure function, fully testable. Get the test suite green before moving on.

**Day 4** — SG-3 (CV parse integration). Now you can normalize everything users have already uploaded with a backfill run.

**Day 5** — SG-4 (job analysis integration). Mirror of SG-3 on the other side.

**Day 6** — SG-5 (roadmap auto-completion). Closes the T2-4 gap from the previous sprint.

**Day 7** — SG-6 (fit score becomes deterministic on skills). The architectural payoff. Run a regression to confirm scores didn't shift unexpectedly.

**Day 7+** — SG-7 (unknown tracking). Quick to add, shape will inform v2 of the taxonomy.

---

## What this gets you for the conference talk

A clean architectural before/after: "We started with skills as strings. Here's what broke. Here's the taxonomy layer we added. Here's what got better — fit scores became deterministic on skill matching, roadmap auto-completion went from broken to working, cohort comparisons became possible."

That's a stronger architectural story than any individual feature. **And** it's invisible to users until they notice things just work better — which is the kind of detail experienced engineers notice and respect.

---

## Backfill (optional, post-sprint)

Once SG-3 and SG-4 are live, run a one-time backfill:

```ts
// scripts/backfill-skills.ts
// 1. For every CV with parsed_data, run normalizer, populate cv_skills.
// 2. For every job_analysis, run normalizer over matched + missing, populate job_analysis_skills.
// 3. Print stats: total CVs, total skills, % normalized, top 20 unknowns.
```

Not a blocker for shipping — new data flows correctly without it. But you'll want it before you can use the skill graph for cohort comparisons retroactively.

---

*Generated by Claude Opus 4.7 — CareerOS skill-graph sprint, April 2026.*
