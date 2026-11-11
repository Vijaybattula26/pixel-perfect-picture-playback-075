/**
 * ATS parsability checklist — pure and deterministic.
 * Six checks: email, phone, standard headings, action-verb strength, bullet consistency, date format.
 */
import { BULLET_RE, detectSections, isEntryHeading } from "./resumeSections";
import { startsWithWeakVerb } from "./resumeTips";

export interface ParsabilityCheck {
  id: "email" | "phone" | "headings" | "action-verbs" | "bullets" | "dates";
  label: string;
  passed: boolean;
  detail: string;
}

const MONTHS_SHORT = "Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const MONTHS_LONG = "January|February|March|April|June|July|August|September|October|November|December";

/** Date styles, most specific first. Matched text is masked so later styles don't re-count it. */
const DATE_STYLES: { style: string; re: RegExp }[] = [
  { style: "Month YYYY", re: new RegExp(`\\b(?:${MONTHS_LONG})\\s+(?:19|20)\\d{2}\\b`, "gi") },
  { style: "Mon YYYY", re: new RegExp(`\\b(?:${MONTHS_SHORT})\\.?\\s+(?:19|20)\\d{2}\\b`, "gi") },
  { style: "MM/YYYY", re: /\b(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}\b/g },
  { style: "YYYY-MM", re: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])\b/g },
  { style: "May YYYY", re: /\bMay\s+(?:19|20)\d{2}\b/gi }, // fits both month styles
  { style: "YYYY", re: /\b(?:19|20)\d{2}\b/g },
];

/** Count date occurrences by style. "May YYYY" is neutral and only reported, never a conflict. */
export function dateStyles(text: string): Record<string, number> {
  let masked = text;
  const counts: Record<string, number> = {};
  for (const { style, re } of DATE_STYLES) {
    masked = masked.replace(re, (m) => {
      counts[style] = (counts[style] ?? 0) + 1;
      return " ".repeat(m.length);
    });
  }
  return counts;
}

export function checkParsability(text: string): ParsabilityCheck[] {
  const s = detectSections(text);

  const core = (["experience", "education", "skills"] as const).filter((k) => !s.sectionsFound.has(k));
  const label = { experience: "Experience", education: "Education", skills: "Skills" } as const;

  const body = s.lines.filter((l) => !l.isHeading && (l.section === "experience" || l.section === "projects") && !isEntryHeading(l.text));
  const achievements = body.filter((l) => l.isBullet || l.text.split(/\s+/).length >= 6);
  const weak = achievements.filter((l) => startsWithWeakVerb(l.text));

  const markers = text
    .split("\n")
    .map((l) => l.match(BULLET_RE)?.[1])
    .filter((m): m is string => Boolean(m));
  const counts = markers.reduce<Record<string, number>>((a, m) => ((a[m] = (a[m] ?? 0) + 1), a), {});
  const dominant = Math.max(0, ...Object.values(counts));
  const bulletsOk = markers.length >= 3 && dominant / markers.length >= 0.8;

  const styles = dateStyles(text);
  const { "May YYYY": neutral = 0, ...rest } = styles;
  const total = Object.values(rest).reduce((a, b) => a + b, 0) + neutral;
  const used = Object.entries(rest).filter(([, n]) => n > 0);
  const datesOk = total > 0 && used.length <= 1;

  return [
    { id: "email", label: "Email address", passed: !!s.email, detail: s.email ? s.email : "No email address found." },
    { id: "phone", label: "Phone number", passed: !!s.phone, detail: s.phone ? s.phone : "No phone number found." },
    {
      id: "headings",
      label: "Standard headings",
      passed: core.length === 0,
      detail: core.length ? `Missing: ${core.map((k) => label[k]).join(", ")}.` : "Experience, Education and Skills found.",
    },
    {
      id: "action-verbs",
      label: "Action-verb strength",
      passed: achievements.length > 0 && weak.length === 0,
      detail: !achievements.length
        ? "No achievement bullets found."
        : weak.length
          ? `${weak.length} of ${achievements.length} bullets open with a weak verb.`
          : `All ${achievements.length} bullets lead with an action verb.`,
    },
    {
      id: "bullets",
      label: "Bullet consistency",
      passed: bulletsOk,
      detail: markers.length < 3 ? "Use bullet points for achievements." : bulletsOk ? "One bullet style throughout." : "Mixed bullet styles.",
    },
    {
      id: "dates",
      label: "Date format",
      passed: datesOk,
      detail: !total ? "No dates found." : datesOk ? `Consistent (${used[0]?.[0] ?? "Month YYYY"}).` : `Mixed: ${used.map(([k]) => k).join(", ")}.`,
    },
  ];
}
