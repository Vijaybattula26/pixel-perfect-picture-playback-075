/**
 * Detects the candidate name, contact line(s) and standard section headings
 * from raw resume text, and tags every line with the section it belongs to.
 */
export type SectionKind =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "other";

export const STANDARD_SECTIONS = ["summary", "experience", "education", "skills", "projects"] as const;
export type StandardSection = (typeof STANDARD_SECTIONS)[number];

const HEADING_SYNONYMS: Record<Exclude<SectionKind, "header">, string[]> = {
  summary: [
    "summary", "professional summary", "career summary", "profile", "professional profile",
    "about", "about me", "objective", "career objective", "overview", "personal statement",
  ],
  experience: [
    "experience", "work experience", "professional experience", "employment",
    "employment history", "work history", "career history", "relevant experience",
    "industry experience", "internships", "internship experience",
  ],
  education: ["education", "academic background", "education and training", "academics", "education & certifications"],
  skills: [
    "skills", "technical skills", "core skills", "key skills", "core competencies",
    "competencies", "technologies", "tech stack", "tools", "skills & tools",
    "tools & technologies", "skills and tools", "areas of expertise", "expertise",
  ],
  projects: ["projects", "personal projects", "selected projects", "key projects", "side projects", "academic projects", "open source"],
  certifications: ["certifications", "certificates", "licenses", "licenses & certifications", "courses"],
  other: [
    "awards", "honors", "achievements", "publications", "volunteer", "volunteering",
    "interests", "hobbies", "languages", "references", "activities", "leadership",
  ],
};

const HEADING_LOOKUP = new Map<string, Exclude<SectionKind, "header">>();
for (const [kind, names] of Object.entries(HEADING_SYNONYMS)) {
  for (const n of names) HEADING_LOOKUP.set(n, kind as Exclude<SectionKind, "header">);
}

export const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
export const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,5}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/;
const LINK_RE = /(linkedin\.com|github\.com|https?:\/\/|www\.)/i;
export const BULLET_RE = /^\s*([•●▪◦‣∙·\-–*>■□➢✓])\s+/;

export interface ResumeLine {
  text: string;
  section: SectionKind;
  isBullet: boolean;
  isHeading: boolean;
}

export interface ResumeStructure {
  name: string | null;
  contactLine: string | null;
  email: string | null;
  phone: string | null;
  headings: { text: string; kind: Exclude<SectionKind, "header"> }[];
  sectionsFound: Set<SectionKind>;
  lines: ResumeLine[];
}

function headingKind(line: string): Exclude<SectionKind, "header"> | null {
  const cleaned = line
    .trim()
    .replace(BULLET_RE, "")
    .replace(/[:|]+$/, "")
    .trim()
    .toLowerCase();
  if (!cleaned || cleaned.split(/\s+/).length > 5) return null;
  return HEADING_LOOKUP.get(cleaned.replace(/\s+/g, " ")) ?? null;
}

function isContact(line: string): boolean {
  return EMAIL_RE.test(line) || LINK_RE.test(line) || (PHONE_RE.test(line) && /\d{7,}/.test(line.replace(/\D/g, "")));
}

function looksLikeName(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 50 || /\d|@/.test(t)) return false;
  const words = t.split(/\s+/);
  return words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-zÀ-ÿ'.-]+$/.test(w));
}

export function detectSections(raw: string): ResumeStructure {
  const rawLines = raw.split(/\n/).map((l) => l.replace(/\s+$/, ""));
  const lines: ResumeLine[] = [];
  const headings: ResumeStructure["headings"] = [];
  const sectionsFound = new Set<SectionKind>();
  let current: SectionKind = "header";
  let name: string | null = null;
  const contactParts: string[] = [];

  for (const text of rawLines) {
    if (!text.trim()) continue;
    const kind = headingKind(text);
    if (kind) {
      current = kind;
      headings.push({ text: text.trim(), kind });
      sectionsFound.add(kind);
      lines.push({ text, section: kind, isBullet: false, isHeading: true });
      continue;
    }
    if (current === "header") {
      if (!name && looksLikeName(text)) name = text.trim();
      else if (isContact(text)) contactParts.push(text.trim());
    }
    lines.push({ text, section: current, isBullet: BULLET_RE.test(text), isHeading: false });
  }

  return {
    name,
    contactLine: contactParts.length ? contactParts.join(" | ") : null,
    email: raw.match(EMAIL_RE)?.[0] ?? null,
    phone: findPhone(raw),
    headings,
    sectionsFound,
    lines,
  };
}

function findPhone(raw: string): string | null {
  const re = new RegExp(PHONE_RE.source, "g");
  for (const m of raw.matchAll(re)) {
    const digits = m[0].replace(/\D/g, "");
    // Skip years/date ranges such as "2019 - 2023".
    if (digits.length >= 10 && digits.length <= 15 && !/^(19|20)\d{2}(19|20)\d{2}$/.test(digits)) return m[0].trim();
  }
  return null;
}

// ── Structured resume document (preview + export) ──────────────────────

/** The structure the preview and exporters render. Same shape as the AI output (minus keyword notes). */
export interface ResumeDocument {
  name: string;
  contact: string;
  summary: string;
  sections: { title: string; bullets: string[] }[];
}

export const stripBulletMarker = (line: string) => line.replace(BULLET_RE, "").trim();

const normHeading = (s: string) => s.trim().replace(/[:|]+$/, "").trim().toLowerCase().replace(/\s+/g, " ");
const YEAR_RE = /\b(19|20)\d{2}\b|\bpresent\b|\bcurrent\b/i;

/**
 * A role / degree line ("Senior Engineer, Acme — Jan 2020 – Present"):
 * short, contains a year or "Present", and doesn't read like a sentence.
 * Rendered bold without a bullet in the preview and exports.
 */
export function isEntryHeading(line: string): boolean {
  const t = stripBulletMarker(line);
  if (!t || /[.!?]$/.test(t)) return false;
  return YEAR_RE.test(t) && t.split(/\s+/).length <= 16;
}

/**
 * Re-parse plain resume text (e.g. an edited preview) into a ResumeDocument.
 * `knownHeadings` lets custom section titles (from the AI output) round-trip.
 */
export function parseResumeText(raw: string, knownHeadings: string[] = []): ResumeDocument {
  const known = new Set(knownHeadings.map(normHeading));
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter(Boolean);

  let name = "";
  const contact: string[] = [];
  const summary: string[] = [];
  const sections: ResumeDocument["sections"] = [];
  let current: ResumeDocument["sections"][number] | "summary" | null = null;

  for (const line of lines) {
    const kind = headingKind(line) ?? (known.has(normHeading(line)) ? "other" : null);
    if (kind) {
      if (kind === "summary") current = "summary";
      else {
        current = { title: line.replace(/[:|]+$/, "").trim(), bullets: [] };
        sections.push(current);
      }
      continue;
    }
    if (current === null) {
      // Header block: name, contact, then any headline text.
      if (!name && (looksLikeName(line) || (!contact.length && !summary.length && !isContact(line) && line.length <= 60))) name = line;
      else if (isContact(line)) contact.push(line);
      else summary.push(stripBulletMarker(line));
      continue;
    }
    if (current === "summary") summary.push(stripBulletMarker(line));
    else current.bullets.push(stripBulletMarker(line));
  }

  // No recognizable headings: keep the body as one section rather than a giant summary.
  if (!sections.length && summary.length > 3) {
    sections.push({ title: "Details", bullets: summary.splice(0) });
  }

  return { name, contact: contact.join(" | "), summary: summary.join(" "), sections: sections.filter((s) => s.bullets.length) };
}

/** Plain text mirroring the preview layout (role lines without bullets). Round-trips through parseResumeText. */
export function documentToText(doc: ResumeDocument): string {
  const out: string[] = [];
  if (doc.name) out.push(doc.name);
  if (doc.contact) out.push(doc.contact);
  if (doc.summary) out.push("", "Summary", doc.summary);
  for (const s of doc.sections) {
    out.push("", s.title);
    for (const b of s.bullets) out.push(isEntryHeading(b) ? b : `• ${b}`);
  }
  return out.join("\n").trim();
}
