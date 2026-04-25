/**
 * One-time script: generate the initial skills taxonomy using Claude.
 * The output was manually reviewed and committed to data/skills-taxonomy.json.
 * Run again only to extend existing categories — review output before committing.
 *
 * Usage: npx tsx scripts/generate-taxonomy.ts
 * Requires: ANTHROPIC_API_KEY in environment.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = [
  { name: "language", description: "Programming languages (Python, TypeScript, Go, Rust, etc.)" },
  { name: "framework", description: "Libraries and frameworks (React, Django, Spring Boot, PyTorch, etc.)" },
  { name: "database", description: "Databases and data stores (PostgreSQL, MongoDB, Redis, Snowflake, etc.)" },
  { name: "cloud", description: "Cloud platforms and services (AWS, GCP, Azure services, Vercel, etc.)" },
  { name: "devops", description: "DevOps tools and practices (Docker, Kubernetes, Terraform, CI/CD tools, etc.)" },
  { name: "tool", description: "Developer tools (Git, Jira, Figma, testing frameworks, bundlers, etc.)" },
  { name: "concept", description: "Technical concepts (microservices, REST, machine learning, OAuth, etc.)" },
  { name: "domain", description: "Business domains (FinTech, HealthTech, SaaS, E-Commerce, etc.)" },
  { name: "soft", description: "Soft skills (leadership, communication, stakeholder management, etc.)" },
];

interface SkillEntry {
  canonical_name: string;
  category: string;
  aliases: string[];
  description: string;
}

async function generateForCategory(category: { name: string; description: string }): Promise<SkillEntry[]> {
  console.log(`Generating ${category.name}...`);

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Generate a list of ~60 canonical skills for the "${category.name}" category.
Category description: ${category.description}

For each skill, provide:
- canonical_name: The official, properly-cased name (e.g. "PostgreSQL", "Next.js", "AWS Lambda")
- aliases: Array of common variations (abbreviations, different casings, common misspellings)
- description: One sentence description

Rules:
- canonical_name must be unique and use the most commonly recognized official name
- aliases should cover: abbreviations (k8s for Kubernetes), lowercase variants, dotted variants (react.js for React), older names
- Do NOT include the canonical_name itself in aliases (that's redundant)
- Focus on skills that actually appear on job listings and CVs
- Avoid deprecated technologies unless still very common

Output valid JSON array:
[
  {
    "canonical_name": "string",
    "category": "${category.name}",
    "aliases": ["string"],
    "description": "string"
  }
]

Output only the JSON array, no other text.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Expected text response");

  try {
    const parsed = JSON.parse(content.text);
    return parsed as SkillEntry[];
  } catch {
    console.error(`Failed to parse JSON for ${category.name}:`, content.text.substring(0, 200));
    return [];
  }
}

async function main() {
  const existing = fs.existsSync(path.join(process.cwd(), "data", "skills-taxonomy.json"))
    ? JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "skills-taxonomy.json"), "utf-8"))
    : { version: "1.0.0", skills: [] };

  const allSkills: SkillEntry[] = [];

  for (const category of CATEGORIES) {
    try {
      const skills = await generateForCategory(category);
      allSkills.push(...skills);
      console.log(`  Generated ${skills.length} skills for ${category.name}`);
    } catch (err) {
      console.error(`  Failed for ${category.name}:`, err);
    }
  }

  // Merge with existing, preferring existing entries
  const existingByCanonical = new Map(existing.skills.map((s: SkillEntry) => [s.canonical_name.toLowerCase(), s]));
  for (const skill of allSkills) {
    if (!existingByCanonical.has(skill.canonical_name.toLowerCase())) {
      existingByCanonical.set(skill.canonical_name.toLowerCase(), skill);
    }
  }

  const merged = {
    version: existing.version,
    generated_at: new Date().toISOString().split("T")[0],
    description: existing.description ?? "CareerOS canonical skill taxonomy.",
    skills: Array.from(existingByCanonical.values()),
  };

  const outPath = path.join(process.cwd(), "data", "skills-taxonomy.generated.json");
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${merged.skills.length} skills to ${outPath}`);
  console.log("Review manually, then replace data/skills-taxonomy.json and run npm run seed:taxonomy");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
