/**
 * Rule-based resume tips for No-AI mode. Pure and deterministic.
 */
import { detectSections, STANDARD_SECTIONS, BULLET_RE } from "./resumeSections";

export interface ResumeTip {
  id: "weak-verbs" | "missing-metrics" | "missing-sections" | "missing-contact" | "no-bullets";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  examples: string[];
}

/** Openers that describe duties instead of results. */
export const WEAK_OPENERS = [
  "responsible for", "helped", "helped with", "worked on", "worked with", "assisted", "assisted with",
  "participated in", "involved in", "was involved in", "handled", "tasked with", "duties included",
  "in charge of", "was part of", "part of", "contributed to", "utilized", "did", "made", "tried",
];

export const STRONG_VERBS = [
  "Built", "Led", "Designed", "Shipped", "Reduced", "Increased", "Automated", "Launched",
  "Optimized", "Migrated", "Architected", "Delivered", "Scaled", "Streamlined", "Mentored",
];

const SECTION_LABEL: Record<(typeof STANDARD_SECTIONS)[number], string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
};

const truncate = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const stripBullet = (s: string) => s.replace(BULLET_RE, "").trim();

/** A bullet "has a metric" when it contains a number, percentage, currency or multiplier. */
export function hasMetric(line: string): boolean {
  return /\d|%|\$|€|£|₹|\b(x|×)\d|\bdoubled\b|\btripled\b|\bhalved\b/i.test(line);
}

export function startsWithWeakVerb(line: string): string | null {
  const t = stripBullet(line).toLowerCase();
  return WEAK_OPENERS.find((w) => t === w || t.startsWith(`${w} `)) ?? null;
}

export function generateTips(resume: string): ResumeTip[] {
  const s = detectSections(resume);
  const tips: ResumeTip[] = [];

  // Achievement lines = bullets in experience/projects, or any non-heading line there if no bullets were detected.
  const bodyLines = s.lines.filter((l) => !l.isHeading && (l.section === "experience" || l.section === "projects"));
  const bullets = bodyLines.some((l) => l.isBullet) ? bodyLines.filter((l) => l.isBullet) : bodyLines.filter((l) => l.text.trim().split(/\s+/).length >= 6);

  const weak = bullets.filter((l) => startsWithWeakVerb(l.text));
  if (weak.length) {
    tips.push({
      id: "weak-verbs",
      severity: weak.length >= 3 ? "high" : "medium",
      title: `${weak.length} bullet${weak.length > 1 ? "s" : ""} start with a weak verb`,
      detail: `Lead with what you did and the result. Try verbs like ${STRONG_VERBS.slice(0, 6).join(", ")}.`,
      examples: weak.slice(0, 3).map((l) => truncate(stripBullet(l.text))),
    });
  }

  const noMetric = bullets.filter((l) => !hasMetric(l.text));
  if (bullets.length && noMetric.length / bullets.length >= 0.5) {
    tips.push({
      id: "missing-metrics",
      severity: noMetric.length / bullets.length >= 0.8 ? "high" : "medium",
      title: `${noMetric.length} of ${bullets.length} achievements have no numbers`,
      detail: "Add real figures you can back up: % improvement, users, revenue, latency, time saved, team size.",
      examples: noMetric.slice(0, 3).map((l) => truncate(stripBullet(l.text))),
    });
  }

  const missing = STANDARD_SECTIONS.filter((k) => !s.sectionsFound.has(k));
  if (missing.length) {
    const critical = missing.some((m) => m === "experience" || m === "skills" || m === "education");
    tips.push({
      id: "missing-sections",
      severity: critical ? "high" : "low",
      title: `Missing section${missing.length > 1 ? "s" : ""}: ${missing.map((m) => SECTION_LABEL[m]).join(", ")}`,
      detail: "ATS parsers look for standard headings. Use these exact names so your content is filed correctly.",
      examples: [],
    });
  }

  const contactMissing = [!s.email && "email", !s.phone && "phone number"].filter(Boolean) as string[];
  if (contactMissing.length) {
    tips.push({
      id: "missing-contact",
      severity: "high",
      title: `No ${contactMissing.join(" or ")} detected`,
      detail: "Put your contact details as plain text near the top — not in a header, footer or image.",
      examples: [],
    });
  }

  if (!s.lines.some((l) => l.isBullet) && bodyLines.length > 0) {
    tips.push({
      id: "no-bullets",
      severity: "low",
      title: "No bullet points detected",
      detail: "Break experience into short bullets (one achievement each). It's easier for ATS and humans to scan.",
      examples: [],
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return tips.sort((a, b) => order[a.severity] - order[b.severity]);
}
