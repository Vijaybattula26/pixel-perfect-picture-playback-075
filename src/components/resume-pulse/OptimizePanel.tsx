import { BotOff, LoaderCircle, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { NoAiPanel } from "./NoAiPanel";
import { OptimizedResult } from "./OptimizedResult";

export function OptimizePanel() {
  const { optimizeStatus, optimize, approvedKeywords, enterNoAiMode } = useAnalyzer();

  if (optimizeStatus === "success") return <OptimizedResult />;
  if (optimizeStatus === "fallback") return <NoAiPanel />;

  const loading = optimizeStatus === "optimizing";
  return (
    <section aria-labelledby="optimize-heading" className="surface-card overflow-hidden">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h3 id="optimize-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <WandSparkles className="size-4 text-primary" aria-hidden />
            Honest AI optimization
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Rewrites your bullets with stronger verbs and works in{" "}
            <span className="font-mono text-foreground">{approvedKeywords.length}</span> approved keyword
            {approvedKeywords.length === 1 ? "" : "s"} — only where your experience supports them. No invented facts.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Your resume and the job description are sent to Google's Gemini API for this step. Nothing is stored by us.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <Button type="button" variant="hero" size="lg" className="h-11" disabled={loading} aria-busy={loading} onClick={() => void optimize()}>
            {loading ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden /> Optimizing…
              </>
            ) : (
              <>
                <WandSparkles aria-hidden /> Optimize with AI
              </>
            )}
          </Button>
          <Button type="button" variant="outline" size="lg" className="h-11" disabled={loading} onClick={() => enterNoAiMode()}>
            <BotOff aria-hidden /> Continue without AI
          </Button>
        </div>
      </div>
    </section>
  );
}
