import { MAX_FILE_BYTES, MIN_INPUT_CHARS } from "./constants";
import type { SupportedFileKind } from "@/types/analyzer";

export function meetsMinLength(text: string, min = MIN_INPUT_CHARS): boolean {
  return text.trim().length >= min;
}

export function canAnalyze(resumeText: string, jobDescription: string): boolean {
  return meetsMinLength(resumeText) && meetsMinLength(jobDescription);
}

export function detectFileKind(file: { name: string; type: string }): SupportedFileKind | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "docx";
  if (type === "text/plain" || name.endsWith(".txt")) return "txt";
  if (/^image\/(png|jpe?g|webp)$/.test(type) || /\.(png|jpe?g|webp)$/.test(name)) return "image";
  return null;
}

export type FileValidation =
  | { ok: true; kind: SupportedFileKind }
  | { ok: false; error: string };

export function validateFile(file: { name: string; type: string; size: number }): FileValidation {
  const kind = detectFileKind(file);
  if (!kind) return { ok: false, error: "Unsupported file. Use PDF, DOCX, TXT, PNG or JPG." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "File is larger than 5 MB." };
  if (file.size === 0) return { ok: false, error: "This file is empty." };
  return { ok: true, kind };
}
