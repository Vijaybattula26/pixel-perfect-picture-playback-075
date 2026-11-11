/**
 * Keyword Match Score — pure, deterministic, runs entirely in the browser.
 *
 * FORMULA (0–100):
 *   score = 70 × keywordCoverage + structurePoints (max 30)
 *
 *   keywordCoverage = Σ(weight × credit) / Σ(weight)   over every JD keyword
 *     credit = 1.0  keyword found with evidence (experience bullet, project, summary prose)
 *     credit = 0.8  keyword found only in a skills list (claimed, not demonstrated)
 *     credit = 0    keyword not found
 *
 *   weight(keyword) = frequencyWeight × contextBoost × kindBoost
 *     frequencyWeight = min(3, 1 + 0.5 × (occurrences − 1))     // repeated terms matter more, capped
 *     contextBoost    = 1.5 if it appears on/under a "required / must / qualifications" line
 *                       1.2 if it appears on/under a "preferred / nice to have / bonus / plus" line
 *                       1.0 otherwise (the highest boost across occurrences wins)
 *     kindBoost       = 1.5 for dictionary skills (hard skills), 1.0 for other JD terms
 *
 *   structurePoints (30) = email 5 + phone 5
 *                        + headings 15 (Experience 4, Skills 4, Education 3, Summary 2, Projects 2)
 *                        + reasonable length 3 (200–1,200 words)
 *                        + consistent bullets 2 (≥ 3 bullets, ≥ 80% share one marker)
 */
import { CASE_SENSITIVE_ALIASES, RELATED_SKILLS, SKILL_ALIASES } from "./skillsDictionary";
import { detectSections, type ResumeStructure, type SectionKind, BULLET_RE } from "./resumeSections";
import { countWords, stem, tokenize } from "./text";

// ── Public types ─────────────────────────────────────────────────────────

export type KeywordKind = "skill" | "term";
export type MatchLocation = "summary" | "experience" | "projects" | "skills" | "education" | "other";

export interface JdKeyword {
  keyword: string;
  kind: KeywordKind;
  weight: number;
  occurrences: number;
  context: "required" | "preferred" | "general";
}

export interface MatchedKeyword extends JdKeyword {
  locations: MatchLocation[];
  /** True when it appears in an experience bullet, project or summary prose — not just a skills list. */
  hasEvidence: boolean;
}

export interface MissingKeyword extends JdKeyword {
  /** Related resume terms that suggest the candidate may truthfully claim it. */
  relatedEvidence: string[];
}

export interface StructureCheck {
  id: "email" | "phone" | "heading-experience" | "heading-skills" | "heading-education" | "heading-summary" | "heading-projects" | "length" | "bullets";
  label: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface ScoreResult {
  /** Keyword Match Score, 0–100. */
  score: number;
  matchedKeywords: MatchedKeyword[];
  missingKeywords: {
    /** Not in the resume, but related skills/terms are — likely claimable. */
    missingWithEvidence: MissingKeyword[];
    /** No trace in the resume. Only add if genuinely true. */
    realGaps: MissingKeyword[];
  };
  checks: StructureCheck[];
  breakdown: {
    keywordCoverage: number; // 0–1
    keywordPoints: number; // 0–70
    structurePoints: number; // 0–30
    matchedWeight: number;
    totalWeight: number;
    wordCount: number;
  };
}

// ── Stopwords & filler ──────────────────────────────────────────────────

const STOPWORDS = new Set(
  `a about above across after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each either etc every few for from further had has have having he her here hers him his how i if in into is it its itself just less like may me might more most must my no nor not of off on once only or other our ours out over own per same shall she should so some such than that the their them then there these they this those through to too under until up upon us very via was we well were what when where which while who whom why will with within without would yet you your yours ourselves themselves`.split(
    /\s+/,
  ),
);

/** Generic JD filler that says nothing about fit. */
const FILLER = new Set(
  `ability able abilities team teams work working works worked job role roles position candidate candidates company companies opportunity opportunities experience experiences experienced year years month months strong excellent good great new using use used including include includes etc plus bonus preferred required requirements requirement must nice have looking look join help helping make making build building ensure ensuring across within related relevant various multiple key day days level levels environment environments world class best fast-paced passionate passion responsible responsibilities skills skill knowledge understanding proficiency proficient familiarity familiar hands-on solid deep high highly s ideal ideally successful success time part full partner partners closely millions customers customer offer offers competitive salary equity remote-friendly generous budget learning degree field equivalent minimum preferably etc. what you'll we're you're it's they're you we'll who's that's take takes taking get gets support supporting provide providing contribute contributing participate participating write writing clean well-tested discussions plus. other others e.g i.e things thing way ways like least software engineer engineers engineering system systems service services production code model models professional frameworks framework design designing tools tooling platform platforms`.split(
    /\s+/,
  ),
);

const REQUIRED_RE = /\b(required|requirements|must|need to have|minimum qualifications|basic qualifications|qualifications|what we're looking for|what you'll need|you have|you bring)\b/i;
const PREFERRED_RE = /\b(preferred|nice to have|nice-to-have|bonus|a plus|is a plus|desired|ideally)\b/i;

// ── Alias index ──────────────────────────────────────────────────────────

interface AliasEntry {
  canonical: string;
  tokens: string[];
}

const ALIAS_INDEX: Map<string, AliasEntry[]> = (() => {
  const idx = new Map<string, AliasEntry[]>();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    for (const alias of new Set([canonical.toLowerCase(), ...aliases])) {
      const tokens = tokenize(alias);
      const first = tokens[0];
      if (!first) continue;
      const list = idx.get(first) ?? [];
      list.push({ canonical, tokens });
      idx.set(first, list);
    }
  }
  // Longest alias first so "react native" beats "react".
  for (const list of idx.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);
  return idx;
})();

/** Greedy longest-match scan for dictionary skills. Returns matched skills and the token positions they consumed. */
function findSkills(tokens: string[]): { skills: Map<string, number[]>; consumed: Set<number> } {
  const skills = new Map<string, number[]>();
  const consumed = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const candidates = ALIAS_INDEX.get(tokens[i]!);
    if (!candidates) continue;
    for (const { canonical, tokens: at } of candidates) {
      if (at.every((t, k) => tokens[i + k] === t)) {
        const arr = skills.get(canonical) ?? [];
        arr.push(i);
        skills.set(canonical, arr);
        for (let k = 0; k < at.length; k++) consumed.add(i + k);
        i += at.length - 1;
        break;
      }
    }
  }
  return { skills, consumed };
}

function findCaseSensitiveSkills(original: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [canonical, aliases] of Object.entries(CASE_SENSITIVE_ALIASES)) {
    let count = 0;
    for (const a of aliases) {
      // Stand-alone word, not part of "Go-to", "C-level", "R&D", "C++", "C#".
      const re = new RegExp(`(^|[\\s,(/;:])${a}(?![\\w+#&'\\-])`, "g");
      count += (original.match(re) ?? []).length;
    }
    if (count) out.set(canonical, count);
  }
  return out;
}

// ── Job description keyword extraction ──────────────────────────────────

/** Lowercased case-sensitive aliases ("rest", "go") — never treat them as plain JD terms. */
const CASE_ALIAS_WORDS = new Set(Object.values(CASE_SENSITIVE_ALIASES).flat().map((a) => a.toLowerCase()));

function isContentToken(t: string): boolean {
  return t.length >= 3 && !STOPWORDS.has(t) && !FILLER.has(t) && !CASE_ALIAS_WORDS.has(t) && !/^\d+$/.test(t) && /[a-z]/.test(t);
}

export function extractJdKeywords(jd: string, limit = 60): JdKeyword[] {
  // Track context per line: a heading such as "Requirements" sets context for the lines below it.
  const lines = jd.split(/\n/);
  let sectionCtx: JdKeyword["context"] = "general";
  const occurrences = new Map<string, { kind: KeywordKind; count: number; ctx: JdKeyword["context"] }>();

  const bump = (key: string, kind: KeywordKind, ctx: JdKeyword["context"], n = 1) => {
    const prev = occurrences.get(key);
    const rank = { general: 0, preferred: 1, required: 2 } as const;
    if (!prev) occurrences.set(key, { kind, count: n, ctx });
    else {
      prev.count += n;
      if (rank[ctx] > rank[prev.ctx]) prev.ctx = ctx;
    }
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const isHeadingLike = line.trim().split(/\s+/).length <= 6 && !/[.;]$/.test(line.trim());
    const lineCtx: JdKeyword["context"] = PREFERRED_RE.test(line) ? "preferred" : REQUIRED_RE.test(line) ? "required" : "general";
    if (isHeadingLike) sectionCtx = lineCtx === "general" ? (/^(about|what you'll do|responsibilities|the role|we offer|benefits)/i.test(line.trim()) ? "general" : sectionCtx) : lineCtx;
    const ctx = lineCtx !== "general" ? lineCtx : sectionCtx;

    const tokens = tokenize(line);
    const { skills, consumed } = findSkills(tokens);
    for (const [skill, pos] of skills) bump(skill, "skill", ctx, pos.length);
    for (const [skill, n] of findCaseSensitiveSkills(line)) bump(skill, "skill", ctx, n);

    // Non-dictionary terms: unigrams + 2–3 word phrases made only of content tokens.
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i]!;
      if (consumed.has(i) || !isContentToken(tok)) continue;
      bump(tok, "term", ctx);
      for (let n = 2; n <= 3; n++) {
        const slice = tokens.slice(i, i + n);
        if (slice.length < n || slice.some((t, k) => consumed.has(i + k) || !isContentToken(t))) break;
        bump(slice.join(" "), "term", ctx);
      }
    }
  }

  const rawSkillsLower = new Set([...occurrences].filter(([, v]) => v.kind === "skill").map(([k]) => k.toLowerCase()));

  const keywords: JdKeyword[] = [];
  for (const [key, { kind, count, ctx }] of occurrences) {
    if (kind === "term") {
      const isPhrase = key.includes(" ");
      // Phrases and plain words must repeat to count (filters one-off prose). A single
      // mention still counts when it sits in a required/preferred context.
      if (isPhrase && count < 2) continue;
      if (!isPhrase && count < 2 && ctx === "general") continue;
      if (rawSkillsLower.has(key)) continue;
    }
    const frequencyWeight = Math.min(3, 1 + 0.5 * (count - 1));
    const contextBoost = ctx === "required" ? 1.5 : ctx === "preferred" ? 1.2 : 1;
    const kindBoost = kind === "skill" ? 1.5 : 1;
    keywords.push({
      keyword: key,
      kind,
      weight: +(frequencyWeight * contextBoost * kindBoost).toFixed(3),
      occurrences: count,
      context: ctx,
    });
  }

  // Drop single words already covered by a kept phrase of the same frequency ("model" inside "model monitoring").
  const phrases = keywords.filter((k) => k.kind === "term" && k.keyword.includes(" "));
  const deduped = keywords.filter(
    (k) => !(k.kind === "term" && !k.keyword.includes(" ") && phrases.some((p) => p.keyword.split(" ").includes(k.keyword) && p.occurrences >= k.occurrences)),
  );

  return deduped
    .sort((a, b) => b.weight - a.weight || (a.kind === "skill" ? -1 : 1) || a.keyword.localeCompare(b.keyword))
    .slice(0, limit);
}

// ── Resume matching ─────────────────────────────────────────────────────

function toLocation(section: SectionKind, isBullet: boolean): MatchLocation {
  if (section === "header") return "summary";
  if (section === "certifications") return isBullet ? "other" : "skills";
  return section;
}

interface ResumeIndex {
  structure: ResumeStructure;
  /** canonical skill → locations */
  skills: Map<string, Set<MatchLocation>>;
  /** per line: stemmed tokens + location */
  lines: { stems: string[]; location: MatchLocation }[];
}

function indexResume(resume: string): ResumeIndex {
  const structure = detectSections(resume);
  const skills = new Map<string, Set<MatchLocation>>();
  const lines: ResumeIndex["lines"] = [];
  for (const line of structure.lines) {
    if (line.isHeading) continue;
    const location = toLocation(line.section, line.isBullet);
    const tokens = tokenize(line.text);
    const add = (s: string) => {
      const set = skills.get(s) ?? new Set();
      set.add(location);
      skills.set(s, set);
    };
    for (const s of findSkills(tokens).skills.keys()) add(s);
    for (const s of findCaseSensitiveSkills(line.text).keys()) add(s);
    lines.push({ stems: tokens.map(stem), location });
  }
  return { structure, skills, lines };
}

const EVIDENCE_LOCATIONS: MatchLocation[] = ["experience", "projects", "summary"];

function locateTerm(term: string, idx: ResumeIndex): MatchLocation[] {
  const target = tokenize(term).map(stem);
  const found = new Set<MatchLocation>();
  for (const { stems, location } of idx.lines) {
    for (let i = 0; i + target.length <= stems.length; i++) {
      if (target.every((t, k) => stems[i + k] === t)) {
        found.add(location);
        break;
      }
    }
  }
  return [...found];
}

// ── Structure checks ────────────────────────────────────────────────────

function structureChecks(resume: string, s: ResumeStructure): StructureCheck[] {
  const words = countWords(resume);
  const bulletMarkers = resume
    .split("\n")
    .map((l) => l.match(BULLET_RE)?.[1])
    .filter((m): m is string => Boolean(m));
  const markerCounts = bulletMarkers.reduce<Record<string, number>>((acc, m) => ((acc[m] = (acc[m] ?? 0) + 1), acc), {});
  const dominant = Math.max(0, ...Object.values(markerCounts));
  const bulletsOk = bulletMarkers.length >= 3 && dominant / bulletMarkers.length >= 0.8;

  const heading = (kind: SectionKind, label: string, max: number): StructureCheck => {
    const passed = s.sectionsFound.has(kind);
    return {
      id: `heading-${kind}` as StructureCheck["id"],
      label: `${label} heading`,
      passed,
      points: passed ? max : 0,
      maxPoints: max,
      detail: passed ? `Found a "${label}" section.` : `Add a clearly labelled "${label}" section.`,
    };
  };

  return [
    { id: "email", label: "Email address", passed: !!s.email, points: s.email ? 5 : 0, maxPoints: 5, detail: s.email ? "Email found." : "No email address detected." },
    { id: "phone", label: "Phone number", passed: !!s.phone, points: s.phone ? 5 : 0, maxPoints: 5, detail: s.phone ? "Phone number found." : "No phone number detected." },
    heading("experience", "Experience", 4),
    heading("skills", "Skills", 4),
    heading("education", "Education", 3),
    heading("summary", "Summary", 2),
    heading("projects", "Projects", 2),
    {
      id: "length",
      label: "Reasonable length",
      passed: words >= 200 && words <= 1200,
      points: words >= 200 && words <= 1200 ? 3 : 0,
      maxPoints: 3,
      detail: words < 200 ? `Only ${words} words — most resumes need 300–800.` : words > 1200 ? `${words} words — consider trimming to 1–2 pages.` : `${words} words.`,
    },
    {
      id: "bullets",
      label: "Consistent bullets",
      passed: bulletsOk,
      points: bulletsOk ? 2 : 0,
      maxPoints: 2,
      detail: bulletMarkers.length < 3 ? "Use bullet points for achievements." : bulletsOk ? `${bulletMarkers.length} bullets, consistent style.` : "Mixed bullet styles — pick one marker.",
    },
  ];
}

// ── Main entry ──────────────────────────────────────────────────────────

export function scoreResume(resume: string, jobDescription: string): ScoreResult {
  const keywords = extractJdKeywords(jobDescription);
  const idx = indexResume(resume);
  const resumeSkills = new Set(idx.skills.keys());

  const matched: MatchedKeyword[] = [];
  const missingWithEvidence: MissingKeyword[] = [];
  const realGaps: MissingKeyword[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const kw of keywords) {
    totalWeight += kw.weight;
    const locations = kw.kind === "skill" ? [...(idx.skills.get(kw.keyword) ?? [])] : locateTerm(kw.keyword, idx);

    if (locations.length) {
      const hasEvidence = locations.some((l) => EVIDENCE_LOCATIONS.includes(l));
      matchedWeight += kw.weight * (hasEvidence ? 1 : 0.8);
      matched.push({ ...kw, locations, hasEvidence });
      continue;
    }

    // Missing — look for related evidence.
    const related: string[] = [];
    if (kw.kind === "skill") {
      for (const r of RELATED_SKILLS[kw.keyword] ?? []) if (resumeSkills.has(r)) related.push(r);
    } else {
      // Multi-word term: at least half its words appear in the resume.
      const parts = kw.keyword.split(" ");
      if (parts.length > 1) {
        const present = parts.filter((p) => locateTerm(p, idx).length > 0);
        if (present.length / parts.length >= 0.5) related.push(...present);
      }
    }
    (related.length ? missingWithEvidence : realGaps).push({ ...kw, relatedEvidence: related });
  }

  const checks = structureChecks(resume, idx.structure);
  const keywordCoverage = totalWeight ? matchedWeight / totalWeight : 0;
  const keywordPoints = 70 * keywordCoverage;
  const structurePoints = checks.reduce((n, c) => n + c.points, 0);

  return {
    score: Math.max(0, Math.min(100, Math.round(keywordPoints + structurePoints))),
    matchedKeywords: matched,
    missingKeywords: { missingWithEvidence, realGaps },
    checks,
    breakdown: {
      keywordCoverage,
      keywordPoints: +keywordPoints.toFixed(1),
      structurePoints,
      matchedWeight: +matchedWeight.toFixed(2),
      totalWeight: +totalWeight.toFixed(2),
      wordCount: countWords(resume),
    },
  };
}

export type ScoreBand = "low" | "mid" | "high";
/** red < 60, amber 60–79, emerald 80–100 */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}
