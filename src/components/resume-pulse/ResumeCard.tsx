import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ClipboardPaste, CloudUpload, FileUser, Lock } from "lucide-react";

import { useAnalyzer } from "@/hooks/use-analyzer";
import { RESUME_MAX_CHARS } from "@/lib/constants";
import type { ResumeInputMode } from "@/types/analyzer";
import { AutoTextarea } from "./AutoTextarea";
import { CharCounter } from "./CharCounter";
import { FileDropzone } from "./FileDropzone";
import { PanelCard } from "./PanelCard";

const tabTrigger =
  "inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-card [&_svg]:size-4";

export function ResumeCard() {
  const { inputMode, setInputMode, pastedText, setPastedText } = useAnalyzer();

  return (
    <PanelCard id="resume-heading" title="Your Resume" icon={FileUser}>
      <TabsPrimitive.Root
        value={inputMode}
        onValueChange={(v) => setInputMode(v as ResumeInputMode)}
        className="flex flex-1 flex-col"
      >
        <TabsPrimitive.List
          aria-label="Resume input method"
          className="flex rounded-lg border border-border bg-muted p-1"
        >
          <TabsPrimitive.Trigger value="upload" className={tabTrigger}>
            <CloudUpload aria-hidden /> Upload File
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="paste" className={tabTrigger}>
            <ClipboardPaste aria-hidden /> Paste Text
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        <TabsPrimitive.Content
          value="upload"
          className="mt-4 flex flex-1 flex-col data-[state=inactive]:hidden focus-visible:outline-none"
        >
          <FileDropzone />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content
          value="paste"
          className="mt-4 flex flex-1 flex-col gap-2 data-[state=inactive]:hidden focus-visible:outline-none"
        >
          <label htmlFor="resume-text" className="sr-only">
            Resume text
          </label>
          <AutoTextarea
            id="resume-text"
            value={pastedText}
            maxLength={RESUME_MAX_CHARS}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste the full text of your resume here…"
            aria-describedby="resume-count"
            className="min-h-64 flex-1"
          />
          <CharCounter id="resume-count" count={pastedText.trim().length} max={RESUME_MAX_CHARS} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Parsed in your browser. If you use AI optimization, your text is sent to Google's Gemini
          API. Nothing is stored by us.
        </span>
      </p>
    </PanelCard>
  );
}
