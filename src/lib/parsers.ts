/**
 * Browser-only resume parsing. Every heavy parser is dynamically imported so it
 * never runs during SSR and only downloads when that file type is used.
 * Text never leaves the browser here.
 */
import type { SupportedFileKind } from "@/types/analyzer";

type ProgressFn = (p: number) => void;

/** Below this many characters a PDF is treated as scanned (image-only). */
export const SCANNED_PDF_THRESHOLD = 200;

export class ParseError extends Error {}

export interface ParseResult {
  text: string;
  /** PDF yielded almost no text — probably a scan. Offer OCR. */
  looksScanned: boolean;
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function loadPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  try {
    return await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === "PasswordException") throw new ParseError("This PDF is password-protected. Remove the password or paste the text.");
    throw new ParseError("This PDF looks damaged. Try re-exporting it or paste the text.");
  }
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
  height: number;
}

/** Sort items top-to-bottom (y), then left-to-right (x), grouping items on the same baseline into a line. */
function itemsToLines(items: PositionedItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; tol: number; parts: PositionedItem[] }[] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= l.tol);
    if (line) line.parts.push(it);
    else lines.push({ y: it.y, tol: Math.max(2, it.height * 0.5), parts: [it] });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((l) =>
      l.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

async function parsePdf(file: File): Promise<ParseResult> {
  const pdf = await loadPdf(file);
  const pages: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items: PositionedItem[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        items.push({ str: item.str, x: item.transform[4], y: item.transform[5], height: item.height || Math.abs(item.transform[3]) || 10 });
      }
      pages.push(itemsToLines(items).join("\n"));
    }
  } finally {
    await pdf.cleanup();
  }
  const text = normalize(pages.join("\n\n"));
  return { text, looksScanned: text.length < SCANNED_PDF_THRESHOLD };
}

async function parseDocx(file: File): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const lib = (mammoth as unknown as { default?: typeof mammoth }).default ?? mammoth;
  try {
    const { value } = await lib.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: normalize(value), looksScanned: false };
  } catch {
    throw new ParseError("This Word file looks damaged. Re-save it as .docx or paste the text.");
  }
}

async function recognize(images: (File | HTMLCanvasElement)[], onProgress?: ProgressFn): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  let current = 0;
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.((current + m.progress) / images.length);
    },
  });
  try {
    const out: string[] = [];
    for (; current < images.length; current++) {
      const { data } = await worker.recognize(images[current]!);
      out.push(data.text);
    }
    onProgress?.(1);
    return out.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

/** OCR every page of a scanned PDF (max 5 pages) by rendering it to a canvas first. */
export async function ocrPdf(file: File, onProgress?: ProgressFn): Promise<string> {
  const pdf = await loadPdf(file);
  const canvases: HTMLCanvasElement[] = [];
  try {
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      canvases.push(canvas);
    }
  } finally {
    await pdf.cleanup();
  }
  return normalize(await recognize(canvases, onProgress));
}

export async function extractText(file: File, kind: SupportedFileKind, onProgress?: ProgressFn): Promise<ParseResult> {
  switch (kind) {
    case "pdf":
      return parsePdf(file);
    case "docx":
      return parseDocx(file);
    case "txt":
      return { text: normalize(await file.text()), looksScanned: false };
    case "image":
      return { text: normalize(await recognize([file], onProgress)), looksScanned: false };
  }
}
