import type { OptimizedResume } from "./optimize-schema";

/** Render the AI output as plain ATS-friendly text (also used to re-score it). */
export function optimizedToPlainText(r: OptimizedResume): string {
  const out: string[] = [];
  if (r.name) out.push(r.name);
  if (r.contact) out.push(r.contact);
  if (r.summary) out.push("", "Summary", r.summary);
  for (const s of r.sections) {
    out.push("", s.title);
    for (const b of s.bullets) out.push(`• ${b}`);
  }
  return out.join("\n").trim();
}
