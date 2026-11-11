export type ResumeInputMode = "upload" | "paste";

export type AnalysisStatus = "idle" | "analyzing" | "done" | "error";

export type UploadStatus = "idle" | "dragging" | "parsing" | "success" | "error";

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
}

export interface AnalysisResults {
  /** Keyword Match Score, 0–100. */
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}
