import { ArrowRight, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { MIN_INPUT_CHARS } from "@/lib/constants";
import { meetsMinLength } from "@/lib/validation";

export function AnalyzeButton() {
  const { canAnalyze, status, analyze, resumeText, jobDescription } = useAnalyzer();
  const loading = status === "analyzing";

  const missing: string[] = [];
  if (!meetsMinLength(resumeText)) missing.push("your resume");
  if (!meetsMinLength(jobDescription)) missing.push("the job description");

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        type="button"
        variant="hero"
        size="xl"
        className="group w-full"
        disabled={!canAnalyze}
        aria-busy={loading}
        aria-describedby="analyze-hint"
        onClick={() => void analyze()}
      >
        {loading ? (
          <>
            <LoaderCircle className="animate-spin" aria-hidden /> Analyzing…
          </>
        ) : (
          <>
            Analyze &amp; Boost My ATS Score
            <motion.span
              aria-hidden
              className="inline-flex transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <ArrowRight />
            </motion.span>
          </>
        )}
      </Button>
      <p id="analyze-hint" className="text-center text-xs text-muted-foreground" aria-live="polite">
        {missing.length > 0
          ? `Add at least ${MIN_INPUT_CHARS} characters to ${missing.join(" and ")} to continue.`
          : "Ready when you are. Scoring takes a few seconds."}
      </p>
    </div>
  );
}
