import { ArrowRight, Copy, Download, RotateCcw, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { copyText, downloadText } from "@/lib/download";
import { bandStyles } from "@/lib/score-ui";
import { cn } from "@/lib/utils";

export function OptimizedResult() {
  const { optimized, results, resetOptimize } = useAnalyzer();
  if (!optimized || !results) return null;
  const { resume, newScore, plainText } = optimized;
  const before = bandStyles(results.score);
  const after = bandStyles(newScore);

  return (
    <section aria-labelledby="optimized-heading" className="surface-card overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="optimized-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <WandSparkles className="size-4 text-primary" aria-hidden /> Optimized resume
          </h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            Keyword Match Score
            <span className={cn("font-mono font-semibold", before.text)}>{results.score}</span>
            <ArrowRight className="size-3.5" aria-hidden />
            <span className={cn("font-mono font-semibold", after.text)}>{newScore}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              const ok = await copyText(plainText);
              toast[ok ? "success" : "error"](ok ? "Copied to clipboard" : "Couldn't copy");
            }}
          >
            <Copy aria-hidden /> Copy text
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => downloadText(plainText, `${resume.name || "resume"}-optimized.txt`.replace(/\s+/g, "-"))}>
            <Download aria-hidden /> Download .txt
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetOptimize}>
            <RotateCcw aria-hidden /> Start over
          </Button>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
        <article className="p-6 sm:p-8">
          <h4 className="text-xl font-semibold tracking-tight text-foreground">{resume.name}</h4>
          {resume.contact && <p className="mt-1 text-sm text-muted-foreground">{resume.contact}</p>}
          {resume.summary && <p className="mt-4 text-sm leading-relaxed text-foreground">{resume.summary}</p>}
          {resume.sections.map((s) => (
            <div key={s.title} className="mt-6">
              <h5 className="border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h5>
              <ul className="mt-3 space-y-1.5">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle-foreground" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </article>

        <aside className="border-t border-border bg-muted/40 p-6 lg:border-t-0 lg:border-l">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Keywords added</h4>
          {resume.addedKeywords.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {resume.addedKeywords.map((k) => (
                <li key={k} className="rounded-md border border-primary/20 bg-primary-soft px-2 py-1 font-mono text-xs font-medium text-primary-hover">
                  {k}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">None — wording improved only.</p>
          )}
          <h4 className="mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">What changed</h4>
          <ul className="mt-3 space-y-2">
            {resume.changeNotes.map((n, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground">
                {n}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">Review every line before using it. You know your experience best.</p>
        </aside>
      </div>
    </section>
  );
}
