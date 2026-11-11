/** Shared text helpers for the scorer and section detector. Pure functions only. */

/** Lowercase, unify quotes/dashes/bullets, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[^\S\n]+/g, " ");
}

/** Slash tokens that are one term. Anything else ("AI/ML", "Python/Go") splits into parts. */
const KEEP_SLASH = new Set(["ci/cd", "a/b", "pl/sql", "tcp/ip", "i/o", "ui/ux", "b2b/b2c"]);

/**
 * Tokenize while keeping tech punctuation inside words:
 * "C++", "C#", "Node.js", "CI/CD", "A/B", "real-time", "p99".
 */
export function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  const raw = norm.match(/[a-z0-9+#&]+(?:[./\-'][a-z0-9+#&]+)*\+*|\.[a-z]+/g) ?? [];
  return raw
    .flatMap((t) => (t.includes("/") && !KEEP_SLASH.has(t) ? t.split("/") : [t]))
    .map((t) => t.replace(/'s$/, ""))
    .filter(Boolean);
}

/**
 * Very small suffix stemmer — enough so "deploying", "deployed", "deploys"
 * and "deployment" meet. Tech tokens with symbols are left alone.
 */
export function stem(token: string): string {
  if (token.length <= 3 || /[^a-z]/.test(token)) return token;
  let t = token;
  for (const suf of ["ations", "ation", "ments", "ment", "ings", "ing", "ies", "ers", "er", "ed", "es", "s"]) {
    if (t.endsWith(suf) && t.length - suf.length >= 3) {
      t = t.slice(0, -suf.length);
      if (suf === "ies") t += "y";
      break;
    }
  }
  // collapse doubled final consonant: "scal-l" → "scal" ("scaling" / "scaled")
  if (/([b-df-hj-np-tv-z])\1$/.test(t)) t = t.slice(0, -1);
  return t;
}

export function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}
