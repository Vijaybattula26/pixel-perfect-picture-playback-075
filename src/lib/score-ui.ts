import { scoreBand, type ScoreBand } from "./atsScorer";

export const BAND_STYLES: Record<ScoreBand, { stroke: string; text: string; soft: string; dot: string; label: string }> = {
  low: { stroke: "stroke-score-low", text: "text-score-low-foreground", soft: "bg-score-low-soft", dot: "bg-score-low", label: "Needs work" },
  mid: { stroke: "stroke-score-mid", text: "text-score-mid-foreground", soft: "bg-score-mid-soft", dot: "bg-score-mid", label: "Getting there" },
  high: { stroke: "stroke-score-high", text: "text-score-high-foreground", soft: "bg-score-high-soft", dot: "bg-score-high", label: "Strong match" },
};

export const bandStyles = (score: number) => BAND_STYLES[scoreBand(score)];
