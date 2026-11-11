/**
 * Server-only: calls Google's Gemini API to rewrite a resume.
 * Never log resume or job-description text — only status codes.
 */
import { createRateLimiter } from "./rate-limit";
import {
  optimizedResumeSchema,
  type OptimizeRequest,
  type OptimizeResponse,
  type OptimizedResume,
} from "./optimize-schema";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// 5 requests per minute per IP (best effort, per server instance).
export const optimizeRateLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

const SYSTEM_INSTRUCTION =
  "You are an expert resume editor. Use ONLY facts present in the resume. Integrate ONLY the approved keywords, and only where the candidate's experience genuinely supports them. Use strong action verbs and ATS-friendly plain wording. Keep all numbers, dates, employers, titles and degrees exactly as given. Never invent roles, tools, degrees, metrics or skills. If a keyword is not supported, skip it. Output only the JSON object, no markdown, no commentary.";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    contact: { type: "STRING" },
    summary: { type: "STRING" },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          bullets: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "bullets"],
        propertyOrdering: ["title", "bullets"],
      },
    },
    addedKeywords: { type: "ARRAY", items: { type: "STRING" } },
    changeNotes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["name", "contact", "summary", "sections", "addedKeywords", "changeNotes"],
  propertyOrdering: ["name", "contact", "summary", "sections", "addedKeywords", "changeNotes"],
};

function buildPrompt({ resumeText, jobDescription, approvedKeywords }: OptimizeRequest): string {
  const keywords = approvedKeywords.length ? approvedKeywords.map((k) => `- ${k}`).join("\n") : "(none — improve wording only)";
  return [
    "Rewrite the resume below for the target job.",
    "Return: name, contact (single line), summary (2–3 sentences), sections (keep the resume's own sections such as Experience, Projects, Education, Skills; for Experience keep each role's title, employer and dates as the first bullet of that role exactly as given), addedKeywords (only approved keywords you actually integrated), changeNotes (short notes describing each change).",
    "",
    "APPROVED KEYWORDS (the candidate confirmed they can truthfully claim these):",
    keywords,
    "",
    "TARGET JOB DESCRIPTION (context only — do not copy claims from it):",
    "<<<JOB_DESCRIPTION",
    jobDescription,
    "JOB_DESCRIPTION>>>",
    "",
    "RESUME (the only source of facts):",
    "<<<RESUME",
    resumeText,
    "RESUME>>>",
  ].join("\n");
}

class GeminiHttpError extends Error {
  constructor(public status: number) {
    super(`Gemini HTTP ${status}`);
  }
}

async function callGeminiOnce(apiKey: string, req: OptimizeRequest): Promise<unknown> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: buildPrompt(req) }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });
  if (!res.ok) throw new GeminiHttpError(res.status);
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  // Strip accidental code fences before parsing.
  return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ""));
}

/** Keep only keywords the candidate approved — the model may not add anything else. */
function enforceApproved(resume: OptimizedResume, approved: string[]): OptimizedResume {
  const allowed = new Set(approved.map((k) => k.toLowerCase()));
  return { ...resume, addedKeywords: resume.addedKeywords.filter((k) => allowed.has(k.trim().toLowerCase())) };
}

export async function optimizeWithGemini(apiKey: string, req: OptimizeRequest): Promise<OptimizeResponse> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callGeminiOnce(apiKey, req);
      const parsed = optimizedResumeSchema.safeParse(raw);
      if (parsed.success) return { ok: true, resume: enforceApproved(parsed.data, req.approvedKeywords) };
      console.warn(`[optimize] invalid JSON shape from Gemini (attempt ${attempt})`);
    } catch (err) {
      if (err instanceof GeminiHttpError) {
        console.error(`[optimize] Gemini responded ${err.status}`);
        if (err.status === 429) {
          return { ok: false, code: "RATE_LIMITED", message: "The AI service is busy right now. Please try again in a minute." };
        }
        return { ok: false, code: "AI_UNAVAILABLE", message: "The AI service is unavailable right now. Please try again later." };
      }
      if (err instanceof SyntaxError) {
        console.warn(`[optimize] unparseable JSON from Gemini (attempt ${attempt})`);
        continue; // retry once
      }
      console.error("[optimize] request to Gemini failed", (err as Error)?.name);
      return { ok: false, code: "AI_UNAVAILABLE", message: "The AI service is unavailable right now. Please try again later." };
    }
  }
  return { ok: false, code: "AI_UNAVAILABLE", message: "The AI returned an unreadable answer. Please try again." };
}
