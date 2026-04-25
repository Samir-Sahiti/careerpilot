import { describe, it, expect, beforeEach } from "vitest";
import { normalizeSkill, normalizeSkills, normalizeString, type TaxonomyIndex } from "../normalizer";

// Build a mock TaxonomyIndex without hitting the database
function buildMockIndex(entries: {
  id: string;
  canonical_name: string;
  category: string;
  aliases: string[];
}[]): TaxonomyIndex {
  const byCanonical = new Map<string, ReturnType<typeof buildSkill>>();
  const byAlias = new Map<string, ReturnType<typeof buildSkill>>();
  const byNormalized = new Map<string, ReturnType<typeof buildSkill>>();

  function buildSkill(e: (typeof entries)[0]) {
    return { id: e.id, canonical_name: e.canonical_name, category: e.category };
  }

  for (const e of entries) {
    const skill = buildSkill(e);

    byCanonical.set(e.canonical_name.toLowerCase().trim(), skill);

    const normCanonical = normalizeString(e.canonical_name);
    if (!byNormalized.has(normCanonical)) byNormalized.set(normCanonical, skill);

    for (const alias of e.aliases) {
      const lowerAlias = alias.toLowerCase().trim();
      if (!byAlias.has(lowerAlias)) byAlias.set(lowerAlias, skill);
      const normAlias = normalizeString(alias);
      if (!byNormalized.has(normAlias)) byNormalized.set(normAlias, skill);
    }
  }

  return { byCanonical, byAlias, byNormalized, loadedAt: Date.now() };
}

const FIXTURE_ENTRIES = [
  {
    id: "1",
    canonical_name: "TypeScript",
    category: "language",
    aliases: ["ts", "typescript"],
  },
  {
    id: "2",
    canonical_name: "React",
    category: "framework",
    aliases: ["reactjs", "react.js", "react js"],
  },
  {
    id: "3",
    canonical_name: "PostgreSQL",
    category: "database",
    aliases: ["postgres", "pg", "postgresql", "psql"],
  },
  {
    id: "4",
    canonical_name: "Kubernetes",
    category: "devops",
    aliases: ["k8s", "kube"],
  },
  {
    id: "5",
    canonical_name: "Next.js",
    category: "framework",
    aliases: ["nextjs", "next js", "next.js 14", "next.js 13"],
  },
  {
    id: "6",
    canonical_name: "AWS Lambda",
    category: "cloud",
    aliases: ["lambda functions", "serverless lambda"],
  },
  {
    id: "7",
    canonical_name: "JavaScript",
    category: "language",
    aliases: ["js", "javascript", "ecmascript", "es6"],
  },
  {
    id: "8",
    canonical_name: "Node.js",
    category: "framework",
    aliases: ["node", "nodejs", "node js"],
  },
  {
    id: "9",
    canonical_name: "Python",
    category: "language",
    aliases: ["python3", "python 3", "py"],
  },
  {
    id: "10",
    canonical_name: "Docker",
    category: "devops",
    aliases: ["docker container", "docker compose", "dockerfile"],
  },
];

let index: TaxonomyIndex;

beforeEach(() => {
  index = buildMockIndex(FIXTURE_ENTRIES);
});

describe("normalizeString", () => {
  it("lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeString("React.js")).toBe("reactjs");
    expect(normalizeString("AWS Lambda")).toBe("awslambda");
    expect(normalizeString("Next.js 14")).toBe("nextjs14");
    expect(normalizeString("C++")).toBe("c");
    expect(normalizeString("  Node.js  ")).toBe("nodejs");
  });
});

describe("normalizeSkill — Tier 1: exact canonical match", () => {
  it("matches canonical name exactly (case-insensitive)", () => {
    const r = normalizeSkill("TypeScript", index);
    expect(r.canonical?.canonical_name).toBe("TypeScript");
    expect(r.match_type).toBe("exact");
  });

  it("matches canonical name in different case", () => {
    const r = normalizeSkill("typescript", index);
    expect(r.canonical?.canonical_name).toBe("TypeScript");
    expect(r.match_type).toBe("exact");
  });

  it("matches canonical name with surrounding whitespace", () => {
    const r = normalizeSkill("  Python  ", index);
    expect(r.canonical?.canonical_name).toBe("Python");
    expect(r.match_type).toBe("exact");
  });

  it("matches PostgreSQL exactly", () => {
    const r = normalizeSkill("PostgreSQL", index);
    expect(r.canonical?.canonical_name).toBe("PostgreSQL");
    expect(r.match_type).toBe("exact");
  });
});

describe("normalizeSkill — Tier 2: alias match", () => {
  it("matches abbreviated alias k8s → Kubernetes", () => {
    const r = normalizeSkill("k8s", index);
    expect(r.canonical?.canonical_name).toBe("Kubernetes");
    expect(r.match_type).toBe("alias");
  });

  it("matches pg → PostgreSQL", () => {
    const r = normalizeSkill("pg", index);
    expect(r.canonical?.canonical_name).toBe("PostgreSQL");
    expect(r.match_type).toBe("alias");
  });

  it("matches ts → TypeScript", () => {
    const r = normalizeSkill("ts", index);
    expect(r.canonical?.canonical_name).toBe("TypeScript");
    expect(r.match_type).toBe("alias");
  });

  it("matches js → JavaScript", () => {
    const r = normalizeSkill("js", index);
    expect(r.canonical?.canonical_name).toBe("JavaScript");
    expect(r.match_type).toBe("alias");
  });

  it("matches alias with different casing", () => {
    const r = normalizeSkill("NEXTJS", index);
    // "nextjs" is an alias for Next.js
    expect(r.canonical?.canonical_name).toBe("Next.js");
    expect(r.match_type).toBe("alias");
  });

  it("matches Postgres → PostgreSQL", () => {
    const r = normalizeSkill("Postgres", index);
    expect(r.canonical?.canonical_name).toBe("PostgreSQL");
    expect(r.match_type).toBe("alias");
  });
});

describe("normalizeSkill — Tier 3: normalized match", () => {
  it("react.js → React (alias match — react.js is an explicit alias)", () => {
    // react.js is listed explicitly as an alias, so tier 2 (alias) fires before tier 3
    const r = normalizeSkill("react.js", index);
    expect(r.canonical?.canonical_name).toBe("React");
    expect(r.match_type).toBe("alias");
  });

  it("node.js → Node.js (exact match — lowercased canonical equals input)", () => {
    // "Node.js" lowercased = "node.js" which exactly matches the input → tier 1
    const r = normalizeSkill("node.js", index);
    expect(r.canonical?.canonical_name).toBe("Node.js");
    expect(r.match_type).toBe("exact");
  });

  it("NEXT.JS → Next.js (exact match — lowercased canonical next.js equals next.js)", () => {
    // "NEXT.JS" lowercased = "next.js" = exactly the lowercased canonical "Next.js" → tier 1
    const r = normalizeSkill("NEXT.JS", index);
    expect(r.canonical?.canonical_name).toBe("Next.js");
    expect(r.match_type).toBe("exact");
  });

  it("aws.lambda → AWS Lambda (normalized match via canonical normalization)", () => {
    // "aws.lambda" → normalizeString → "awslambda"
    // "AWS Lambda" canonical → normalizeString → "awslambda"
    const r = normalizeSkill("aws.lambda", index);
    expect(r.canonical?.canonical_name).toBe("AWS Lambda");
    expect(r.match_type).toBe("normalized");
  });

  it("amazon web services → no match (not in fixture)", () => {
    const r = normalizeSkill("amazon web services", index);
    expect(r.match_type).toBe("none");
  });

  it("Next.js 14 → Next.js (version stripped via normalization)", () => {
    // "next.js 14" is an alias, so it hits alias tier first
    const r = normalizeSkill("next.js 14", index);
    expect(r.canonical?.canonical_name).toBe("Next.js");
  });

  it("docker compose → Docker (normalized alias)", () => {
    // "docker compose" is an alias for Docker
    const r = normalizeSkill("docker compose", index);
    expect(r.canonical?.canonical_name).toBe("Docker");
  });
});

describe("normalizeSkill — Tier 4: no match", () => {
  it("returns null for unknown skill", () => {
    const r = normalizeSkill("Elixir Phoenix", index);
    expect(r.canonical).toBeNull();
    expect(r.match_type).toBe("none");
  });

  it("returns null for empty string", () => {
    const r = normalizeSkill("", index);
    expect(r.canonical).toBeNull();
    expect(r.match_type).toBe("none");
  });

  it("returns null for whitespace-only", () => {
    const r = normalizeSkill("   ", index);
    expect(r.canonical).toBeNull();
    expect(r.match_type).toBe("none");
  });

  it("returns null for random words", () => {
    const r = normalizeSkill("foo bar baz", index);
    expect(r.canonical).toBeNull();
    expect(r.match_type).toBe("none");
  });

  it("preserves raw text in result", () => {
    const r = normalizeSkill("foobar", index);
    expect(r.raw).toBe("foobar");
  });
});

describe("normalizeSkills (batch)", () => {
  it("normalizes an array of mixed-quality inputs", () => {
    const inputs = ["TypeScript", "k8s", "react.js", "unknown-skill-xyz", "pg"];
    const results = normalizeSkills(inputs, index);

    expect(results).toHaveLength(5);
    expect(results[0].canonical?.canonical_name).toBe("TypeScript");
    expect(results[0].match_type).toBe("exact");
    expect(results[1].canonical?.canonical_name).toBe("Kubernetes");
    expect(results[1].match_type).toBe("alias");
    expect(results[2].canonical?.canonical_name).toBe("React");
    expect(results[3].canonical).toBeNull();
    expect(results[4].canonical?.canonical_name).toBe("PostgreSQL");
  });

  it("returns NormalizationResult for every input", () => {
    const results = normalizeSkills(["A", "B", "C"], index);
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r).toHaveProperty("raw");
      expect(r).toHaveProperty("canonical");
      expect(r).toHaveProperty("match_type");
    });
  });

  it("handles empty array", () => {
    expect(normalizeSkills([], index)).toEqual([]);
  });
});

describe("real-world skill fixture inputs", () => {
  const cases: [string, string | null, string][] = [
    ["python3", "Python", "alias"],
    ["Python 3", "Python", "alias"],
    ["py", "Python", "alias"],
    ["JS", "JavaScript", "alias"],
    ["es6", "JavaScript", "alias"],
    ["Postgres", "PostgreSQL", "alias"],
    ["psql", "PostgreSQL", "alias"],
    ["kube", "Kubernetes", "alias"],
    ["K8s", "Kubernetes", "alias"],
    ["dockerfile", "Docker", "alias"],
    ["lambda functions", "AWS Lambda", "alias"],
    ["serverless lambda", "AWS Lambda", "alias"],
    ["next.js 13", "Next.js", "alias"],
    ["ReactJS", "React", "alias"],
    ["SomethingNobodyUsed", null, "none"],
  ];

  it.each(cases)('normalizeSkill("%s") → %s (%s)', (input, expectedName, expectedType) => {
    const r = normalizeSkill(input, index);
    expect(r.canonical?.canonical_name ?? null).toBe(expectedName);
    expect(r.match_type).toBe(expectedType);
  });
});
