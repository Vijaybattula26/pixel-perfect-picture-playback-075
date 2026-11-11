/** Split text into plain / highlighted segments for the given keywords (case-insensitive, whole-term). */
export interface Segment {
  text: string;
  hit: boolean;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function highlightSegments(text: string, keywords: string[]): Segment[] {
  const terms = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!terms.length || !text) return [{ text, hit: false }];
  const re = new RegExp(`(?<![A-Za-z0-9])(${terms.map(escape).join("|")})(?![A-Za-z0-9])`, "gi");
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), hit: false });
    out.push({ text: m[0], hit: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}
