import type { ScoreResult } from "./atsScorer";
import { MAX_APPROVED_KEYWORDS } from "./constants";

/**
 * Approvals after a fresh analysis:
 * - "Missing — you have evidence" keywords start checked.
 * - "Real gaps" start unchecked, unless the user already approved them and they still apply.
 * Capped at MAX_APPROVED_KEYWORDS.
 */
export function initialApprovals(result: ScoreResult, previous: string[] = []): string[] {
  const evidence = result.missingKeywords.missingWithEvidence.map((k) => k.keyword);
  const gaps = new Set(result.missingKeywords.realGaps.map((k) => k.keyword));
  const keptGaps = previous.filter((k) => gaps.has(k));
  return [...new Set([...evidence, ...keptGaps])].slice(0, MAX_APPROVED_KEYWORDS);
}
