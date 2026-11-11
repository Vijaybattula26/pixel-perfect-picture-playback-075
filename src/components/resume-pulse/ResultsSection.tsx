import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { KeywordReport } from "./KeywordReport";
import { OptimizePanel } from "./OptimizePanel";
import { ScoreCard } from "./ScoreCard";

export function ResultsSection() {
  const { results, isStale, analyze, canAnalyze } = useAnalyzer();
  if (!results) return null;

  return (
    <motion.section
      id="results"
      aria-labelledby="results-heading"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-16 scroll-mt-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="results-heading" className="text-2xl font-semibold tracking-tight text-foreground">
            Your results
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Scored in your browser against the job description.</p>
        </div>
        {isStale && (
          <div className="flex items-center gap-2 rounded-lg border border-score-mid/40 bg-score-mid-soft px-3 py-1.5 text-xs text-score-mid-foreground">
            Inputs changed since this score.
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={!canAnalyze} onClick={() => void analyze()}>
              <RotateCcw aria-hidden /> Re-analyze
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <div className="lg:sticky lg:top-24">
          <ScoreCard result={results} />
        </div>
        <KeywordReport result={results} />
      </div>

      <div id="optimize" className="mt-6 scroll-mt-24">
        <OptimizePanel />
      </div>
    </motion.section>
  );
}
