import { Info } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p className="flex items-center gap-2">
          <Info className="size-3.5 shrink-0" aria-hidden />
          Keyword Match Score is an estimate, not a guarantee. Real ATS systems vary.
        </p>
        <p className="font-mono">© {new Date().getFullYear()} ResumePulse</p>
      </div>
    </footer>
  );
}
