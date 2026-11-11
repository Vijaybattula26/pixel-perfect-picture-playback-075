import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { scoreResume } from "@/lib/atsScorer";
import { MAX_APPROVED_KEYWORDS } from "@/lib/constants";
import { optimizedToPlainText } from "@/lib/optimized-text";
import { optimizeResume } from "@/lib/optimize.functions";
import { parseOptimizeRequest } from "@/lib/optimize-schema";
import { ParseError, extractText, ocrPdf } from "@/lib/parsers";
import { generateTips, type ResumeTip } from "@/lib/resumeTips";
import { canAnalyze as canAnalyzeInputs, validateFile } from "@/lib/validation";
import type {
  AnalysisResults,
  AnalysisStatus,
  OptimizeOutcome,
  OptimizeStatus,
  ResumeInputMode,
  UploadState,
} from "@/types/analyzer";

interface AnalyzerContextValue {
  /** The resume text for the active input mode. */
  resumeText: string;
  jobDescription: string;
  status: AnalysisStatus;
  results: AnalysisResults | null;
  /** Inputs changed since the last analysis. */
  isStale: boolean;

  inputMode: ResumeInputMode;
  pastedText: string;
  upload: UploadState;
  canAnalyze: boolean;

  approvedKeywords: string[];
  optimizeStatus: OptimizeStatus;
  optimized: OptimizeOutcome | null;
  fallbackReason: string | null;
  tips: ResumeTip[];
  /** The exact resume text that was analyzed (shown in No-AI mode). */
  analyzedResume: string;

  setInputMode: (mode: ResumeInputMode) => void;
  setPastedText: (text: string) => void;
  setJobDescription: (text: string) => void;
  setDragging: (dragging: boolean) => void;
  handleFile: (file: File) => Promise<void>;
  runOcr: () => Promise<void>;
  removeFile: () => void;
  analyze: () => Promise<void>;
  toggleKeyword: (keyword: string) => void;
  setApprovedKeywords: (keywords: string[]) => void;
  optimize: () => Promise<void>;
  enterNoAiMode: (reason?: string) => void;
  resetOptimize: () => void;
}

const AnalyzerContext = createContext<AnalyzerContextValue | null>(null);

const initialUpload: UploadState = { status: "idle", file: null, error: null, progress: null, ocr: false };

const MIN_TEXT = 30;

export function AnalyzerProvider({ children }: { children: ReactNode }) {
  const [inputMode, setInputMode] = useState<ResumeInputMode>("upload");
  const [pastedText, setPastedText] = useState("");
  const [parsedText, setParsedText] = useState("");
  const [upload, setUpload] = useState<UploadState>(initialUpload);
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [snapshot, setSnapshot] = useState<{ resume: string; jd: string } | null>(null);
  const [approvedKeywords, setApprovedKeywordsState] = useState<string[]>([]);
  const [optimizeStatus, setOptimizeStatus] = useState<OptimizeStatus>("idle");
  const [optimized, setOptimized] = useState<OptimizeOutcome | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const pendingFile = useRef<File | null>(null);
  const optimizeFn = useServerFn(optimizeResume);

  const resumeText = inputMode === "upload" ? parsedText : pastedText;
  const canAnalyze = canAnalyzeInputs(resumeText, jobDescription) && status !== "analyzing";
  const isStale = !!snapshot && (snapshot.resume !== resumeText || snapshot.jd !== jobDescription);
  const analyzedResume = snapshot?.resume ?? "";
  const tips = useMemo(() => (optimizeStatus === "fallback" && analyzedResume ? generateTips(analyzedResume) : []), [optimizeStatus, analyzedResume]);

  const setDragging = useCallback((dragging: boolean) => {
    setUpload((u) => {
      if (u.status === "parsing" || u.status === "success" || u.status === "scanned") return u;
      if (dragging) return { ...u, status: "dragging" };
      return u.status === "dragging" ? { ...u, status: u.error ? "error" : "idle" } : u;
    });
  }, []);

  const fail = useCallback((message: string) => {
    pendingFile.current = null;
    setParsedText("");
    setUpload({ ...initialUpload, status: "error", error: message });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const check = validateFile(file);
      if (!check.ok) return fail(check.error);
      const meta = { name: file.name, size: file.size, kind: check.kind };
      pendingFile.current = file;
      setUpload({ status: "parsing", file: meta, error: null, progress: null, ocr: check.kind === "image" });
      try {
        const { text, looksScanned } = await extractText(file, check.kind, (p) =>
          setUpload((u) => (u.status === "parsing" ? { ...u, progress: p } : u)),
        );
        if (looksScanned) {
          setParsedText(text);
          setUpload({ status: "scanned", file: meta, error: null, progress: null, ocr: false });
          return;
        }
        if (text.length < MIN_TEXT) return fail("We couldn't find readable text in this file. Try another file or paste the text.");
        setParsedText(text);
        setUpload({ status: "success", file: meta, error: null, progress: null, ocr: false });
      } catch (err) {
        fail(err instanceof ParseError ? err.message : "We couldn't read this file. Try another format or paste the text.");
      }
    },
    [fail],
  );

  const runOcr = useCallback(async () => {
    const file = pendingFile.current;
    if (!file) return;
    const meta = { name: file.name, size: file.size, kind: "pdf" as const };
    setUpload({ status: "parsing", file: meta, error: null, progress: 0, ocr: true });
    try {
      const text = await ocrPdf(file, (p) => setUpload((u) => (u.status === "parsing" ? { ...u, progress: p } : u)));
      if (text.length < MIN_TEXT) return fail("Text recognition found nothing readable. Try a clearer scan or paste the text.");
      setParsedText(text);
      setUpload({ status: "success", file: meta, error: null, progress: null, ocr: false });
    } catch (err) {
      fail(err instanceof ParseError ? err.message : "Text recognition failed. Try another file or paste the text.");
    }
  }, [fail]);

  const removeFile = useCallback(() => {
    pendingFile.current = null;
    setParsedText("");
    setUpload(initialUpload);
  }, []);

  const analyze = useCallback(async () => {
    if (!canAnalyzeInputs(resumeText, jobDescription)) return;
    setStatus("analyzing");
    // Let the loading state paint; scoring itself is synchronous and fast.
    await new Promise((r) => setTimeout(r, 350));
    try {
      const r = scoreResume(resumeText, jobDescription);
      setResults(r);
      setSnapshot({ resume: resumeText, jd: jobDescription });
      // Keep approvals that still apply to the new keyword list.
      const missing = new Set([...r.missingKeywords.missingWithEvidence, ...r.missingKeywords.realGaps].map((k) => k.keyword));
      setApprovedKeywordsState((prev) => prev.filter((k) => missing.has(k)));
      setOptimizeStatus("idle");
      setOptimized(null);
      setFallbackReason(null);
      setStatus("done");
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setStatus("error");
      toast.error("Something went wrong while scoring. Please try again.");
    }
  }, [resumeText, jobDescription]);

  const toggleKeyword = useCallback((keyword: string) => {
    setApprovedKeywordsState((prev) => {
      if (prev.includes(keyword)) return prev.filter((k) => k !== keyword);
      if (prev.length >= MAX_APPROVED_KEYWORDS) {
        toast.message(`You can approve up to ${MAX_APPROVED_KEYWORDS} keywords.`);
        return prev;
      }
      return [...prev, keyword];
    });
  }, []);

  const setApprovedKeywords = useCallback((keywords: string[]) => {
    setApprovedKeywordsState([...new Set(keywords)].slice(0, MAX_APPROVED_KEYWORDS));
  }, []);

  const enterNoAiMode = useCallback((reason?: string) => {
    setOptimized(null);
    setFallbackReason(reason ?? null);
    setOptimizeStatus("fallback");
    requestAnimationFrame(() => document.getElementById("optimize")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const resetOptimize = useCallback(() => {
    setOptimized(null);
    setFallbackReason(null);
    setOptimizeStatus("idle");
  }, []);

  const optimize = useCallback(async () => {
    if (!snapshot) return;
    const payload = { resumeText: snapshot.resume, jobDescription: snapshot.jd, approvedKeywords };
    const local = parseOptimizeRequest(payload);
    const goFallback = (message: string) => {
      toast.error(message, { description: "Switched to No-AI mode — your original resume is kept." });
      enterNoAiMode(message);
    };
    if (!local.ok) return goFallback(local.message);

    setOptimizeStatus("optimizing");
    try {
      const res = await optimizeFn({ data: local.data });
      if (!res.ok) return goFallback(res.message);
      const plainText = optimizedToPlainText(res.resume);
      const newScore = scoreResume(plainText, snapshot.jd).score;
      setOptimized({ resume: res.resume, newScore, plainText });
      setOptimizeStatus("success");
      requestAnimationFrame(() => document.getElementById("optimize")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      goFallback("The AI service is unavailable right now. Please try again later.");
    }
  }, [snapshot, approvedKeywords, optimizeFn, enterNoAiMode]);

  const value = useMemo<AnalyzerContextValue>(
    () => ({
      resumeText,
      jobDescription,
      status,
      results,
      isStale,
      inputMode,
      pastedText,
      upload,
      canAnalyze,
      approvedKeywords,
      optimizeStatus,
      optimized,
      fallbackReason,
      tips,
      analyzedResume,
      setInputMode,
      setPastedText,
      setJobDescription,
      setDragging,
      handleFile,
      runOcr,
      removeFile,
      analyze,
      toggleKeyword,
      setApprovedKeywords,
      optimize,
      enterNoAiMode,
      resetOptimize,
    }),
    [
      resumeText, jobDescription, status, results, isStale, inputMode, pastedText, upload, canAnalyze,
      approvedKeywords, optimizeStatus, optimized, fallbackReason, tips, analyzedResume,
      setDragging, handleFile, runOcr, removeFile, analyze, toggleKeyword, setApprovedKeywords,
      optimize, enterNoAiMode, resetOptimize,
    ],
  );

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
}

export function useAnalyzer(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext);
  if (!ctx) throw new Error("useAnalyzer must be used inside <AnalyzerProvider>");
  return ctx;
}
