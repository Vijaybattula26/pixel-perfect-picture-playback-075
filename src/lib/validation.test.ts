import { describe, expect, it } from "vitest";
import { canAnalyze, validateFile } from "./validation";

const chars = (n: number) => "a".repeat(n);

describe("analyze button gating", () => {
  it("stays disabled when either input has fewer than 100 characters", () => {
    expect(canAnalyze(chars(99), chars(500))).toBe(false);
    expect(canAnalyze(chars(500), chars(99))).toBe(false);
  });

  it("enables once both inputs have at least 100 characters", () => {
    expect(canAnalyze(chars(100), chars(100))).toBe(true);
  });

  it("does not count surrounding whitespace toward the 100 characters", () => {
    expect(canAnalyze(`   ${chars(99)}   `, chars(100))).toBe(false);
  });
});

describe("resume file validation", () => {
  it("rejects files larger than 5 MB", () => {
    const r = validateFile({ name: "cv.pdf", type: "application/pdf", size: 5 * 1024 * 1024 + 1 });
    expect(r.ok).toBe(false);
  });

  it("accepts a 5 MB PDF", () => {
    const r = validateFile({ name: "cv.pdf", type: "application/pdf", size: 5 * 1024 * 1024 });
    expect(r).toEqual({ ok: true, kind: "pdf" });
  });

  it("accepts DOCX, TXT and images but rejects other formats", () => {
    expect(validateFile({ name: "cv.docx", type: "", size: 10 }).ok).toBe(true);
    expect(validateFile({ name: "cv.txt", type: "text/plain", size: 10 }).ok).toBe(true);
    expect(validateFile({ name: "cv.png", type: "image/png", size: 10 }).ok).toBe(true);
    expect(validateFile({ name: "cv.doc", type: "application/msword", size: 10 }).ok).toBe(false);
  });
});
