import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP, setResponseHeader, setResponseStatus } from "@tanstack/react-start/server";

import { parseOptimizeRequest, type OptimizeResponse } from "./optimize-schema";

/**
 * Public (no login) AI resume optimizer. Validates input, applies a per-IP
 * rate limit, then calls Gemini through Lovable AI.
 * Resume text is never stored or logged.
 */
export const optimizeResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(async ({ data }): Promise<OptimizeResponse> => {
    setResponseHeader("cache-control", "no-store");

    const parsed = parseOptimizeRequest(data);
    if (!parsed.ok) {
      setResponseStatus(400);
      return { ok: false, code: "INVALID_INPUT", message: parsed.message };
    }

    const { optimizeRateLimiter, optimizeWithAI } = await import("./optimize.server");

    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const limit = optimizeRateLimiter.check(ip);
    if (!limit.allowed) {
      setResponseStatus(429);
      setResponseHeader("retry-after", String(limit.retryAfterSec));
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: `Too many requests. Please wait ${limit.retryAfterSec}s and try again.`,
      };
    }

    const result = await optimizeWithAI(parsed.data);
    if (!result.ok) setResponseStatus(result.code === "RATE_LIMITED" ? 429 : 503);
    return result;
  });
