export const MIN_INPUT_CHARS = 100;
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const JD_MAX_CHARS = 20000;

export const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
} as const;

export const ACCEPT_ATTR = Object.entries(ACCEPTED_FILE_TYPES)
  .flatMap(([mime, exts]) => [mime, ...exts])
  .join(",");
