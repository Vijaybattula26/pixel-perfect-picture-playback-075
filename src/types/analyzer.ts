import type { ScoreResult } from "@/lib/atsScorer";
import type { OptimizedResume } from "@/lib/optimize-schema";

export type ResumeInputMode = "upload" | "paste";

export type AnalysisStatus = "idle" | "analyzing" | "done" | "error";

/** "scanned" = PDF had almost no text; we offer OCR. */
export type UploadStatus = "idle" | "dragging" | "parsing" | "scanned" | "success" | "error";

export type SupportedFileKind = "pdf" | "docx" | "txt" | "image";

export interface UploadedFileMeta {
  name: string;
  size: number;
  kind: SupportedFileKind;
}

export interface UploadState {
  status: UploadStatus;
  file: UploadedFileMeta | null;
  error: string | null;
  /** 0–1 progress for slow parsers (OCR). */
  progress: number | null;
  /** True while OCR (rather than plain parsing) is running. */
  ocr: boolean;
}

export type AnalysisResults = ScoreResult;

/** idle → optimizing → success | fallback (No-AI mode). */
export type OptimizeStatus = "idle" | "optimizing" | "success" | "fallback";

export interface OptimizeOutcome {
  resume: OptimizedResume;
  /** Keyword Match Score of the optimized text against the same JD. */
  newScore: number;
  plainText: string;
}
