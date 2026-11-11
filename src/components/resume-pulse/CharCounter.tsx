import { MIN_INPUT_CHARS } from "@/lib/constants";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CharCounter({ count, max, id }: { count: number; max?: number; id?: string }) {
  const ok = count >= MIN_INPUT_CHARS;
  return (
    <p
      id={id}
      aria-live="polite"
      className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
    >
      <span>
        {ok ? "Looks good" : `At least ${MIN_INPUT_CHARS} characters needed`}
      </span>
      <span className={cn("font-mono tabular-nums", ok && "text-score-high-foreground")}>
        {formatCount(count)}
        {max ? ` / ${formatCount(max)}` : ""}
      </span>
    </p>
  );
}
