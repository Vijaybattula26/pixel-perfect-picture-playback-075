import { describe, expect, it } from "vitest";

import { extractJdKeywords, scoreBand, scoreResume } from "./atsScorer";
import { detectSections } from "./resumeSections";
import { generateTips } from "./resumeTips";
import { parseOptimizeRequest } from "./optimize-schema";
import { createRateLimiter } from "./rate-limit";

const JD = `Requirements
- Must have strong JavaScript and Kubernetes experience.
- Experience with PostgreSQL and CI/CD pipelines.
Nice to have
- Experience with Terraform.`;

const RESUME = `Jane Doe
jane@example.com | +1 415 555 0134

Summary
Engineer shipping web platforms.

Experience
• Built a JS dashboard deployed on K8s, cutting load time by 30%.
• Set up CI CD for 12 services.

Skills
Postgres, Terraform

Education
B.S. Computer Science`;

describe("Keyword Match Score", () => {
  it("matches skills through aliases (JS, K8s, Postgres, CI CD)", () => {
    const r = scoreResume(RESUME, JD);
    const matched = r.matchedKeywords.map((m) => m.keyword);
    expect(matched).toEqual(expect.arrayContaining(["JavaScript", "Kubernetes", "PostgreSQL", "CI/CD"]));
  });

  it("marks a skills-list-only match as having no evidence", () => {
    const r = scoreResume(RESUME, JD);
    expect(r.matchedKeywords.find((m) => m.keyword === "PostgreSQL")?.hasEvidence).toBe(false);
    expect(r.matchedKeywords.find((m) => m.keyword === "Kubernetes")?.hasEvidence).toBe(true);
  });

  it("boosts required keywords above preferred ones", () => {
    const kws = extractJdKeywords(JD);
    const js = kws.find((k) => k.keyword === "JavaScript")!;
    const tf = kws.find((k) => k.keyword === "Terraform")!;
    expect(js.context).toBe("required");
    expect(tf.context).toBe("preferred");
    expect(js.weight).toBeGreaterThan(tf.weight);
  });

  it("is 70% keyword coverage plus up to 30 structure points", () => {
    const r = scoreResume(RESUME, JD);
    expect(r.breakdown.structurePoints).toBeLessThanOrEqual(30);
    expect(r.score).toBe(Math.round(70 * r.breakdown.keywordCoverage + r.breakdown.structurePoints));
  });

  it("splits missing keywords into likely-claimable and real gaps", () => {
    const r = scoreResume("Experience\n• Deployed services with Docker and Terraform.", "Requirements\n- Kubernetes\n- Infrastructure as Code\n- Haskell");
    expect(r.missingKeywords.missingWithEvidence.map((k) => k.keyword)).toContain("Infrastructure as Code");
    expect(r.missingKeywords.realGaps.map((k) => k.keyword)).not.toContain("Infrastructure as Code");
  });

  it("is deterministic", () => {
    expect(scoreResume(RESUME, JD)).toEqual(scoreResume(RESUME, JD));
  });

  it("uses red below 60, amber 60–79, emerald 80+", () => {
    expect(scoreBand(59)).toBe("low");
    expect(scoreBand(60)).toBe("mid");
    expect(scoreBand(79)).toBe("mid");
    expect(scoreBand(80)).toBe("high");
  });
});

describe("resume sections", () => {
  it("detects the name, contact line and standard headings", () => {
    const s = detectSections(RESUME);
    expect(s.name).toBe("Jane Doe");
    expect(s.contactLine).toContain("jane@example.com");
    expect([...s.sectionsFound]).toEqual(expect.arrayContaining(["summary", "experience", "skills", "education"]));
    expect(s.sectionsFound.has("projects")).toBe(false);
  });
});

describe("No-AI tips", () => {
  it("flags weak verbs, missing metrics and missing sections", () => {
    const tips = generateTips(`Experience\n• Responsible for the API.\n• Helped with deployments.\n• Worked on the dashboard.`);
    const ids = tips.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["weak-verbs", "missing-metrics", "missing-sections"]));
  });
});

describe("optimize request validation", () => {
  const ok = { resumeText: "a", jobDescription: "b", approvedKeywords: [] as string[] };

  it("accepts the documented limits", () => {
    expect(parseOptimizeRequest({ resumeText: "a".repeat(20000), jobDescription: "b".repeat(12000), approvedKeywords: Array(40).fill("k") }).ok).toBe(true);
  });

  it("rejects resumeText over 20,000 characters", () => {
    expect(parseOptimizeRequest({ ...ok, resumeText: "a".repeat(20001) }).ok).toBe(false);
  });

  it("rejects jobDescription over 12,000 characters", () => {
    expect(parseOptimizeRequest({ ...ok, jobDescription: "b".repeat(12001) }).ok).toBe(false);
  });

  it("rejects more than 40 approved keywords", () => {
    expect(parseOptimizeRequest({ ...ok, approvedKeywords: Array(41).fill("k") }).ok).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(parseOptimizeRequest({ ...ok, resumeText: 42 }).ok).toBe(false);
    expect(parseOptimizeRequest({ ...ok, approvedKeywords: [1, 2] }).ok).toBe(false);
  });
});

describe("rate limit", () => {
  it("allows 5 requests per minute per IP, then blocks", () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) expect(rl.check("1.2.3.4", 1000 + i).allowed).toBe(true);
    expect(rl.check("1.2.3.4", 2000).allowed).toBe(false);
    expect(rl.check("5.6.7.8", 2000).allowed).toBe(true);
    expect(rl.check("1.2.3.4", 61_001).allowed).toBe(true);
  });
});
