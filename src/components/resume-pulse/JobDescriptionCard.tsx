import { Briefcase, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { JD_MAX_CHARS } from "@/lib/constants";
import { SAMPLE_JOB_DESCRIPTION } from "@/lib/sample-jd";
import { AutoTextarea } from "./AutoTextarea";
import { CharCounter } from "./CharCounter";
import { PanelCard } from "./PanelCard";

export function JobDescriptionCard() {
  const { jobDescription, setJobDescription } = useAnalyzer();

  return (
    <PanelCard
      id="jd-heading"
      title="Target Job Description"
      icon={Briefcase}
      action={
        <Button
          type="button"
          variant="soft"
          size="sm"
          onClick={() => setJobDescription(SAMPLE_JOB_DESCRIPTION)}
        >
          <Sparkles aria-hidden /> Paste sample JD
        </Button>
      }
    >
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="jd-text" className="sr-only">
          Job description
        </label>
        <AutoTextarea
          id="jd-text"
          value={jobDescription}
          maxLength={JD_MAX_CHARS}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description you're applying for. Include responsibilities and requirements for the most accurate match."
          aria-describedby="jd-count"
          className="min-h-[19.5rem] flex-1"
        />
        <CharCounter id="jd-count" count={jobDescription.trim().length} max={JD_MAX_CHARS} />
      </div>
    </PanelCard>
  );
}
