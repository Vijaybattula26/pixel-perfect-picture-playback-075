import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { extractText } from "@/lib/parse-file";
import { canAnalyze as canAnalyzeInputs, validateFile } from "@/lib/validation";
import type {
  AnalysisResults,
  AnalysisStatus,
  ResumeInputMode,
  UploadState,
} from "@/types/analyzer";

interface AnalyzerContextValue {
  /** The resume text for the active input mode. */
  resumeText: string;
  jobDescription: string;
  status: AnalysisStatus;
  results: AnalysisResults | null;

  inputMode: ResumeInputMode;
  pastedText: string;
  upload: UploadState;
  canAnalyze: boolean;

  setInputMode: (mode: ResumeInputMode) => void;
  setPastedText: (text: string) => void;
  setJobDescription: (text: string) => void;
  setDragging: (dragging: boolean) => void;
  handleFile: (file: File) => Promise<void>;
  removeFile: () => void;
  analyze: () => Promise<void>;
}

const AnalyzerContext = createContext<AnalyzerContextValue | null>(null);

const initialUpload: UploadState = { status: "idle", file: null, error: null, progress: null };

export function AnalyzerProvider({ children }: { children: ReactNode }) {
  const [inputMode, setInputMode] = useState<ResumeInputMode>("upload");
  const [pastedText, setPastedText] = useState("");
  const [parsedText, setParsedText] = useState("");
  const [upload, setUpload] = useState<UploadState>(initialUpload);
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [results, setResults] = useState<AnalysisResults | null>(null);

  const resumeText = inputMode === "upload" ? parsedText : pastedText;
  const canAnalyze = canAnalyzeInputs(resumeText, jobDescription) && status !== "analyzing";

  const setDragging = useCallback((dragging: boolean) => {
    setUpload((u) => {
      if (u.status === "parsing" || u.status === "success") return u;
      if (dragging) return { ...u, status: "dragging" };
      return u.status === "dragging" ? { ...u, status: u.error ? "error" : "idle" } : u;
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const check = validateFile(file);
    if (!check.ok) {
      setParsedText("");
      setUpload({ status: "error", file: null, error: check.error, progress: null });
      return;
    }
    const meta = { name: file.name, size: file.size, kind: check.kind };
    setUpload({ status: "parsing", file: meta, error: null, progress: null });
    try {
      const text = await extractText(file, check.kind, (p) =>
        setUpload((u) => (u.status === "parsing" ? { ...u, progress: p } : u)),
      );
      if (text.length < 30) {
        throw new Error("We couldn't find readable text. Try another file or paste the text.");
      }
      setParsedText(text);
      setUpload({ status: "success", file: meta, error: null, progress: null });
    } catch (err) {
      setParsedText("");
      const message =
        err instanceof Error && err.message.startsWith("We couldn't")
          ? err.message
          : "We couldn't read this file. Try another format or paste the text.";
      setUpload({ status: "error", file: null, error: message, progress: null });
    }
  }, []);

  const removeFile = useCallback(() => {
    setParsedText("");
    setUpload(initialUpload);
  }, []);

  // Placeholder: real scoring is wired up in a later step.
  const analyze = useCallback(async () => {
    if (!canAnalyzeInputs(resumeText, jobDescription)) return;
    setStatus("analyzing");
    setResults(null);
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("done");
    toast.success("Inputs look good", {
      description: "Keyword scoring is coming next — nothing was stored.",
    });
  }, [resumeText, jobDescription]);

  const value = useMemo<AnalyzerContextValue>(
    () => ({
      resumeText,
      jobDescription,
      status,
      results,
      inputMode,
      pastedText,
      upload,
      canAnalyze,
      setInputMode,
      setPastedText,
      setJobDescription,
      setDragging,
      handleFile,
      removeFile,
      analyze,
    }),
    [
      resumeText,
      jobDescription,
      status,
      results,
      inputMode,
      pastedText,
      upload,
      canAnalyze,
      setDragging,
      handleFile,
      removeFile,
      analyze,
    ],
  );

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
}

export function useAnalyzer(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error("useAnalyzer must be used inside <AnalyzerProvider>");
  return ctx;
}
