import { motion } from "framer-motion";

import { bandStyles } from "@/lib/score-ui";
import { cn } from "@/lib/utils";

export function ScoreRing({ score, size = 168, label = "Keyword Match Score" }: { score: number; size?: number; label?: string }) {
  const stroke = Math.max(8, Math.round(size / 14));
  const r = (size - stroke) / 2;
  const band = bandStyles(score);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={band.stroke}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-mono font-semibold tracking-tight text-foreground tabular-nums", size >= 140 ? "text-5xl" : "text-2xl")}>{score}</span>
        {size >= 140 && <span className="mt-0.5 font-mono text-xs text-muted-foreground">/ 100</span>}
      </div>
    </div>
  );
}
