import { useRef, type DragEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleAlert,
  CloudUpload,
  FileCheck,
  FileImage,
  FileText,
  FileType,
  FileCode,
  LoaderCircle,
  ScanText,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAnalyzer } from "@/hooks/use-analyzer";
import { ACCEPT_ATTR } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const FORMATS = [
  { icon: FileText, label: "PDF" },
  { icon: FileType, label: "DOCX" },
  { icon: FileCode, label: "TXT" },
  { icon: FileImage, label: "IMG" },
];

const fade = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18 },
};

export function FileDropzone() {
  const { upload, handleFile, removeFile, setDragging, runOcr } = useAnalyzer();
  const inputRef = useRef<HTMLInputElement>(null);
  const { status } = upload;
  const interactive = status !== "parsing" && status !== "success" && status !== "scanned";

  const open = () => interactive && inputRef.current?.click();

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!interactive) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : -1}
        aria-label={interactive ? "Upload resume file. PDF, DOCX, TXT or image, up to 5 MB." : undefined}
        aria-describedby="dropzone-status"
        onClick={open}
        onKeyDown={onKeyDown}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-64 flex-1 flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed px-6 py-8 text-center transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
          interactive && "cursor-pointer",
          status === "idle" && "border-border-strong bg-muted/50 hover:border-primary/60 hover:bg-primary-soft/40",
          status === "dragging" && "border-primary bg-primary-soft ring-4 ring-primary/10",
          status === "parsing" && "border-border-strong bg-muted/50",
          status === "success" && "border-solid border-score-high/40 bg-score-high-soft",
          status === "scanned" && "border-solid border-score-mid/50 bg-score-mid-soft",
          status === "error" && "border-destructive/50 bg-destructive-soft hover:border-destructive",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {(status === "idle" || status === "dragging") && (
            <motion.div key="idle" {...fade} className="flex flex-col items-center">
              <motion.span
                animate={status === "dragging" ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
                className="grid size-12 place-items-center rounded-xl border border-border bg-card text-primary shadow-card"
              >
                <CloudUpload className="size-5" aria-hidden />
              </motion.span>
              <p className="mt-4 text-sm font-medium text-foreground">
                {status === "dragging" ? "Drop to upload" : (
                  <>
                    Drag &amp; drop your resume, or{" "}
                    <span className="text-primary underline decoration-primary/30 underline-offset-4">
                      browse
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Up to 5 MB</p>
              <ul className="mt-5 flex items-center gap-2" aria-label="Supported formats">
                {FORMATS.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground"
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {status === "parsing" && (
            <motion.div key="parsing" {...fade} className="flex w-full max-w-xs flex-col items-center">
              <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden />
              <p className="mt-4 text-sm font-medium text-foreground">
                Reading {upload.file?.name ?? "file"}…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {upload.ocr ? "Running text recognition in your browser" : "Parsing in your browser"}
              </p>
              {upload.progress !== null && (
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.round(upload.progress * 100)}%` }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {status === "success" && upload.file && (
            <motion.div key="success" {...fade} className="flex w-full max-w-sm flex-col items-center">
              <span className="grid size-12 place-items-center rounded-xl bg-score-high text-primary-foreground">
                <FileCheck className="size-5" aria-hidden />
              </span>
              <div className="mt-4 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-card">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{upload.file.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{formatBytes(upload.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${upload.file.name}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-3 text-xs font-medium text-score-high-foreground">Parsed successfully</p>
            </motion.div>
          )}

          {status === "scanned" && upload.file && (
            <motion.div key="scanned" {...fade} className="flex w-full max-w-sm flex-col items-center">
              <span className="grid size-12 place-items-center rounded-xl border border-score-mid/30 bg-card text-score-mid-foreground">
                <ScanText className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground">This PDF looks scanned</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                We found almost no text in {upload.file.name}. Run text recognition (OCR) in your
                browser to read it.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void runOcr();
                  }}
                >
                  <ScanText aria-hidden /> Run OCR
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  Choose another file
                </Button>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div key="error" {...fade} className="flex flex-col items-center">
              <span className="grid size-12 place-items-center rounded-xl border border-destructive/20 bg-card text-destructive">
                <CircleAlert className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground">{upload.error}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click or drop another file to try again
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <span id="dropzone-status" className="sr-only" aria-live="polite">
          {status === "parsing" && "Parsing file"}
          {status === "scanned" && "This PDF looks scanned. Run OCR to read it."}
          {status === "success" && `${upload.file?.name} uploaded`}
          {status === "error" && upload.error}
        </span>
      </div>
    </div>
  );
}
