import { BotOff, Copy, Lightbulb, RotateCcw, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { copyText } from "@/lib/download";
import { cn } from "@/lib/utils";

const SEVERITY = {
  high: { label: "High impact", cls: "bg-score-low-soft text-score-low-foreground" },
  medium: { label: "Medium", cls: "bg-score-mid-soft text-score-mid-foreground" },
  low: { label: "Quick win", cls: "bg-muted text-muted-foreground" },
} as const;

export function NoAiPanel() {
  const { tips, fallbackReason, results, analyzedResume, resetOptimize, optimize } = useAnalyzer();
  const gaps = results ? [...results.missingKeywords.missingWithEvidence, ...results.missingKeywords.realGaps] : [];

  return (
    <section aria-labelledby="noai-heading" className="surface-card overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="noai-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <BotOff className="size-4 text-muted-foreground" aria-hidden /> No-AI mode
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {fallbackReason ? `${fallbackReason} ` : ""}Your original resume is kept as-is. Use the gap report and tips below to edit it yourself.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {fallbackReason && (
            <Button type="button" variant="soft" size="sm" onClick={() => void optimize()}>
              <WandSparkles aria-hidden /> Try AI again
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={resetOptimize}>
            <RotateCcw aria-hidden /> Back
          </Button>
        </div>
      </header>

      <div className="grid lg:grid-cols-2">
        <div className="p-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="size-4 text-score-mid-foreground" aria-hidden /> Tips for this resume
          </h4>
          {tips.length ? (
            <ol className="mt-4 space-y-4">
              {tips.map((t) => (
                <li key={t.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", SEVERITY[t.severity].cls)}>{SEVERITY[t.severity].label}</span>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.detail}</p>
                  {t.examples.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {t.examples.map((e, i) => (
                        <li key={i} className="border-l-2 border-border-strong pl-2.5 text-xs text-foreground">
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No structural issues found. Focus on the keyword gaps.</p>
          )}

          <h4 className="mt-8 text-sm font-semibold text-foreground">Keyword gaps to address</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">Add these only where they're true for you.</p>
          {gaps.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {gaps.map((k) => (
                <li key={k.keyword} className="rounded-md border border-border-strong bg-card px-2 py-1 font-mono text-xs text-foreground">
                  {k.keyword}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No gaps.</p>
          )}
        </div>

        <div className="border-t border-border bg-muted/40 p-6 lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">Your original resume</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await copyText(analyzedResume);
                toast[ok ? "success" : "error"](ok ? "Copied to clipboard" : "Couldn't copy");
              }}
            >
              <Copy aria-hidden /> Copy
            </Button>
          </div>
          <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-4 font-sans text-xs leading-relaxed text-foreground">
            {analyzedResume}
          </pre>
        </div>
      </div>
    </section>
  );
}
