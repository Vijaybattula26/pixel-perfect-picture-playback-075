import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-medium transition-colors";

export function MatchedChip({ keyword, hasEvidence }: { keyword: string; hasEvidence: boolean }) {
  return (
    <li
      className={cn(
        base,
        hasEvidence
          ? "border-score-high/30 bg-score-high-soft text-score-high-foreground"
          : "border-dashed border-score-high/40 bg-card text-score-high-foreground",
      )}
      title={hasEvidence ? "Backed by your experience or projects" : "Only listed in skills — show it in an achievement"}
    >
      <Check className="size-3" aria-hidden />
      {keyword}
      {!hasEvidence && <span className="font-sans text-[10px] font-normal text-muted-foreground">skills only</span>}
    </li>
  );
}

export function ToggleChip({
  keyword,
  selected,
  onToggle,
  hint,
}: {
  keyword: string;
  selected: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        title={hint}
        className={cn(
          base,
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          selected
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary-hover"
            : "border-border-strong bg-card text-foreground hover:border-primary/60 hover:bg-primary-soft",
        )}
      >
        {selected ? <Check className="size-3" aria-hidden /> : <Plus className="size-3" aria-hidden />}
        {keyword}
      </button>
    </li>
  );
}
