import { CircleCheck, CircleX } from "lucide-react";

import type { ScoreResult } from "@/lib/atsScorer";
import { bandStyles } from "@/lib/score-ui";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./ScoreRing";

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {value.toFixed(value % 1 ? 1 : 0)} <span className="text-muted-foreground">/ {max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreCard({ result }: { result: ScoreResult }) {
  const band = bandStyles(result.score);
  const { breakdown } = result;
  return (
    <section aria-labelledby="score-heading" className="surface-card p-6">
      <h3 id="score-heading" className="text-sm font-semibold tracking-tight text-foreground">
        Keyword Match Score
      </h3>
      <div className="mt-5 flex flex-col items-center">
        <ScoreRing score={result.score} />
        <span className={cn("mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", band.soft, band.text)}>
          <span className={cn("size-1.5 rounded-full", band.dot)} aria-hidden />
          {band.label}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <Bar label="Keyword coverage" value={breakdown.keywordPoints} max={70} />
        <Bar label="Structure" value={breakdown.structurePoints} max={30} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-mono text-foreground">{result.matchedKeywords.length}</span> of{" "}
        <span className="font-mono text-foreground">
          {result.matchedKeywords.length + result.missingKeywords.missingWithEvidence.length + result.missingKeywords.realGaps.length}
        </span>{" "}
        job keywords found
      </p>

      <div className="mt-6 border-t border-border pt-5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Structure checks</h4>
        <ul className="mt-3 space-y-2.5">
          {result.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5 text-sm">
              {c.passed ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-score-high" aria-hidden />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0 text-score-low" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground">{c.label}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {c.points}/{c.maxPoints}
                  </span>
                </div>
                {!c.passed && <p className="text-xs text-muted-foreground">{c.detail}</p>}
                <span className="sr-only">{c.passed ? "Passed" : "Not passed"}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
