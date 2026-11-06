import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BAYES_C, MAX_TAGS, TAGS, bayesianScore, formatScore, isValidTagList, overallScore } from "../../lib/scoring";

describe("overallScore", () => {
  it("is the mean of the four core categories", () => {
    expect(overallScore({ temperature: 5, flow: 4, trajectory: 3, taste: 4 })).toBe(4);
  });
});

describe("bayesianScore", () => {
  it("is the global mean when a fountain has no ratings", () => {
    expect(bayesianScore(0, 0, 3.4)).toBeCloseTo(3.4);
  });

  it("matches the formula (C*m + sum) / (C + n)", () => {
    // 3 ratings summing to 13.5, global mean 3.25, C = 5 -> (16.25 + 13.5) / 8
    expect(bayesianScore(13.5, 3, 3.25)).toBeCloseTo(3.71875);
  });

  it("ranks one perfect rating below forty 4.6s", () => {
    const m = 3.5;
    const onePerfect = bayesianScore(5, 1, m);
    const fortyGood = bayesianScore(40 * 4.6, 40, m);
    expect(fortyGood).toBeGreaterThan(onePerfect);
  });
});

describe("formatScore", () => {
  it("shows one decimal, or a dash when missing", () => {
    expect(formatScore(4.25)).toBe("4.3");
    expect(formatScore(null)).toBe("–");
  });
});

describe("isValidTagList", () => {
  it("accepts known tags up to the max", () => {
    expect(isValidTagList([])).toBe(true);
    expect(isValidTagList(["ice_cold", "hidden_gem", "broken"])).toBe(true);
  });

  it("rejects unknown tags", () => {
    expect(isValidTagList(["ice_cold", "tastes_like_lawson"])).toBe(false);
  });

  it(`rejects more than ${MAX_TAGS} tags`, () => {
    expect(isValidTagList(["ice_cold", "splashy", "hidden_gem", "broken"])).toBe(false);
  });
});

describe("TS and SQL stay in sync", () => {
  const dir = join(__dirname, "../../supabase/migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  it("tag allowlist matches the DB check constraint", () => {
    const match = sql.match(/tags <@ array\[([\s\S]*?)\]::text\[\]/);
    expect(match).not.toBeNull();
    const sqlTags = [...match![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(sqlTags).toEqual([...TAGS]);
    expect(sql).toContain(`cardinality(tags) <= ${MAX_TAGS}`);
  });

  it("BAYES_C matches scoring_c() in SQL", () => {
    expect(sql).toMatch(new RegExp(`select ${BAYES_C}::numeric`));
  });
});
