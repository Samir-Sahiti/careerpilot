/**
 * Lists the top N unresolved unknown skills by frequency.
 * Use to identify taxonomy gaps and decide which skills to add.
 *
 * Maintenance loop:
 *   1. Run: npx tsx scripts/review-unknowns.ts
 *   2. Add relevant skills to data/skills-taxonomy.json
 *   3. Run: npm run seed:taxonomy  (marks matching unknowns as resolved)
 *   4. Repeat weekly.
 *
 * Usage: npx tsx scripts/review-unknowns.ts [--limit 50]
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const limitArg = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1], 10)
  : 50;

async function main() {
  const { data, error } = await supabase
    .from("unknown_skills")
    .select("raw_text_lower, source, occurrence_count, first_seen, last_seen")
    .is("resolved_at", null)
    .order("occurrence_count", { ascending: false })
    .limit(limitArg);

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No unresolved unknown skills. Taxonomy is fully covering all seen inputs.");
    return;
  }

  console.log(`Top ${data.length} unresolved unknown skills:\n`);
  console.log(
    "Count".padEnd(8) +
    "Source".padEnd(14) +
    "First Seen".padEnd(13) +
    "Raw Text"
  );
  console.log("-".repeat(70));

  for (const row of data) {
    const date = new Date(row.first_seen).toISOString().split("T")[0];
    console.log(
      String(row.occurrence_count).padEnd(8) +
      String(row.source).padEnd(14) +
      date.padEnd(13) +
      row.raw_text_lower
    );
  }

  console.log("\nTo add these to the taxonomy:");
  console.log("  1. Edit data/skills-taxonomy.json");
  console.log("  2. Run: npm run seed:taxonomy");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
