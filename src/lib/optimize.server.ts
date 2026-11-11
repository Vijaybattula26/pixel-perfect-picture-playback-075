/**
 * Server-only: rewrites a resume with Gemini through Lovable AI.
 * Never log resume or job-description text — only error codes and request ids.
 */
import { GatewayError, PaymentRequiredError, RateLimitError, generateChatCompletion } from "@lovable.dev/ai-gateway";

import { createRateLimiter } from "./rate-limit";
import {
  optimizedResumeSchema,
  type OptimizeRequest,
  type OptimizeResponse,
  type OptimizedResume,
} from "./optimize-schema";

const MODEL = "google/gemini-3.8-flash";

// 5 requests per minute per IP (best effort, per server instance).
export const optimizeRateLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

const SYSTEM_INSTRUCTION =
  "You are an expert resume editor. Use ONLY facts present in the resume. Integrate ONLY the approved keywords, and only where the candidate's experience genuinely supports them. Use strong action verbs and ATS-friendly plain wording. Keep all numbers, dates, employers, titles and degrees exactly as given. Never invent roles, tools, degrees, metrics or skills. If a keyword is not supported, skip it. Output only the JSON object, no markdown, no commentary.";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    contact: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["title", "bullets"],
      },
    },
    addedKeywords: { type: "array", items: { type: "string" } },
    changeNotes: { type: "array", items: { type: "string" } },
  },
  required: ["name", "contact", "summary", "sections", "addedKeywords", "changeNotes"],
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

async function callModelOnce(req: OptimizeRequest): Promise<unknown> {
  const completion = await generateChatCompletion({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: buildPrompt(req) },
    ],
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: { name: "optimized_resume", strict: true, schema: RESPONSE_SCHEMA },
    },
  });
  const content = completion.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  // Strip accidental code fences before parsing.
  return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ""));
}

/** Keep only keywords the candidate approved — the model may not add anything else. */
function enforceApproved(resume: OptimizedResume, approved: string[]): OptimizedResume {
  const allowed = new Set(approved.map((k) => k.toLowerCase()));
  return { ...resume, addedKeywords: resume.addedKeywords.filter((k) => allowed.has(k.trim().toLowerCase())) };
}

const UNAVAILABLE = { ok: false, code: "AI_UNAVAILABLE", message: "The AI service is unavailable right now. Please try again later." } as const;

export async function optimizeWithAI(req: OptimizeRequest): Promise<OptimizeResponse> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callModelOnce(req);
      const parsed = optimizedResumeSchema.safeParse(raw);
      if (parsed.success) return { ok: true, resume: enforceApproved(parsed.data, req.approvedKeywords) };
      console.warn(`[optimize] invalid JSON shape from model (attempt ${attempt})`);
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.warn(`[optimize] unparseable JSON from model (attempt ${attempt})`);
        continue; // retry once
      }
      if (err instanceof GatewayError) {
        console.error(`[optimize] AI error ${err.code} status=${err.httpStatus ?? "-"} ids=${JSON.stringify(err.ids ?? {})}`);
        if (err instanceof RateLimitError) {
          return { ok: false, code: "RATE_LIMITED", message: "The AI service is busy right now. Please try again in a minute." };
        }
        if (err instanceof PaymentRequiredError) {
          return { ok: false, code: "AI_UNAVAILABLE", message: "AI optimization is paused right now. Please try again later." };
        }
        return UNAVAILABLE;
      }
      console.error("[optimize] unexpected failure", (err as Error)?.name);
      return UNAVAILABLE;
    }
  }
  return { ok: false, code: "AI_UNAVAILABLE", message: "The AI returned an unreadable answer. Please try again." };
}
