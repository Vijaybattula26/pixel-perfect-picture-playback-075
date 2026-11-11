import { Activity } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <a
          href="/"
          className="flex items-center gap-2 rounded-md text-foreground"
          aria-label="ResumePulse home"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-button">
            <Activity className="size-4" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">ResumePulse</span>
        </a>

        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full rounded-full bg-score-high animate-pulse-ring" />
            <span className="relative inline-flex size-2 rounded-full bg-score-high" />
          </span>
          <span className="hidden sm:inline">Free - No signup - Local scoring</span>
          <span className="sm:hidden">Free - No signup</span>
        </div>
      </nav>
    </header>
  );
}
