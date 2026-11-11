/**
 * Browser-only resume parsing. Every heavy parser is dynamically imported so it
 * never runs during SSR and only downloads when the user actually uploads that type.
 * Text never leaves the browser here.
 */
import type { SupportedFileKind } from "@/types/analyzer";

type ProgressFn = (p: number) => void;

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      } else {
        line += " ";
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }
  await pdf.cleanup();
  return pages.join("\n\n");
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const lib = (mammoth as unknown as { default?: typeof mammoth }).default ?? mammoth;
  const { value } = await lib.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

async function parseImage(file: File, onProgress?: ProgressFn): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractText(
  file: File,
  kind: SupportedFileKind,
  onProgress?: ProgressFn,
): Promise<string> {
  let raw: string;
  switch (kind) {
    case "pdf":
      raw = await parsePdf(file);
      break;
    case "docx":
      raw = await parseDocx(file);
      break;
    case "txt":
      raw = await file.text();
      break;
    case "image":
      raw = await parseImage(file, onProgress);
      break;
  }
  return normalize(raw);
}
