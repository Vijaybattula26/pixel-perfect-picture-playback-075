/** Shared (client-safe) contract for the AI optimize server function. */
import { z } from "zod";

export const OPTIMIZE_LIMITS = {
  resumeText: 20000,
  jobDescription: 12000,
  approvedKeywords: 40,
  keywordLength: 80,
} as const;

export const optimizeRequestSchema = z.object(
  {
    resumeText: z
      .string({ invalid_type_error: "resumeText must be a string.", required_error: "resumeText is required." })
      .trim()
      .min(1, "resumeText is empty.")
      .max(OPTIMIZE_LIMITS.resumeText, `resumeText must be at most ${OPTIMIZE_LIMITS.resumeText} characters.`),
    jobDescription: z
      .string({ invalid_type_error: "jobDescription must be a string.", required_error: "jobDescription is required." })
      .trim()
      .min(1, "jobDescription is empty.")
      .max(OPTIMIZE_LIMITS.jobDescription, `jobDescription must be at most ${OPTIMIZE_LIMITS.jobDescription} characters.`),
    approvedKeywords: z
      .array(
        z
          .string({ invalid_type_error: "approvedKeywords must contain only strings." })
          .trim()
          .min(1)
          .max(OPTIMIZE_LIMITS.keywordLength, `Each keyword must be at most ${OPTIMIZE_LIMITS.keywordLength} characters.`),
        { invalid_type_error: "approvedKeywords must be an array of strings.", required_error: "approvedKeywords is required." },
      )
      .max(OPTIMIZE_LIMITS.approvedKeywords, `approvedKeywords can have at most ${OPTIMIZE_LIMITS.approvedKeywords} items.`),
  },
  { invalid_type_error: "Request body must be a JSON object." },
);

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;

export const optimizedResumeSchema = z.object({
  name: z.string(),
  contact: z.string(),
  summary: z.string(),
  sections: z
    .array(z.object({ title: z.string().min(1), bullets: z.array(z.string()) }))
    .min(1),
  addedKeywords: z.array(z.string()),
  changeNotes: z.array(z.string()),
});

export type OptimizedResume = z.infer<typeof optimizedResumeSchema>;

export type OptimizeErrorCode = "INVALID_INPUT" | "RATE_LIMITED" | "AI_UNAVAILABLE";

export type OptimizeResponse =
  | { ok: true; resume: OptimizedResume }
  | { ok: false; code: OptimizeErrorCode; message: string };

/** Parse an unknown body into a request, or a single clear error message. */
export function parseOptimizeRequest(input: unknown): { ok: true; data: OptimizeRequest } | { ok: false; message: string } {
  const r = optimizeRequestSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const issue = r.error.issues[0];
  return { ok: false, message: issue?.message ?? "Invalid request." };
}
