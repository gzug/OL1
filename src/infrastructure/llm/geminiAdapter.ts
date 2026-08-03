/**
 * The Gemini REST call. One model, one key, no routing — routing is `llmRouter.ts`.
 *
 * PORTED from Legacy `apps/mobile/src/data/llm/geminiAdapter.ts`. What came across, and why:
 *
 * - **The key travels in the `x-goog-api-key` header, never in the URL.** Legacy's comment records
 *   what this cost them: a key in the query string (`?key=…`) is captured verbatim by telemetry
 *   breadcrumbs, which scrub PHI but not URLs, so the secret leaked to a third party. It is also
 *   the rule against putting sensitive values in URL parameters, arrived at the hard way.
 * - The `AbortController` timeout, and the `isTimeout` flag on the error it throws, because a
 *   timeout has to be told apart from a refusal to know whether retrying is worth anything.
 * - `httpStatus` attached to the thrown error, which is what lets the router decide 429-retry
 *   from 401-stop without parsing a message string.
 *
 * What did NOT come across: Legacy's three keys (`_PRO`, `_FLASH`, and a fallback) and the
 * `Constants.expoConfig.extra` lookup beside them. OL1 has one model and one key, and three ways to
 * find a secret is three places for it to be wrong.
 */

import type { ChatRequest } from '@/core/chat';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** The one model. Nothing in the UI names it — the user picks coaches, never models. */
export const MODEL_ID = 'gemini-2.5-flash';

/**
 * Read as a literal member expression, never `process.env[name]`. Expo's babel transform inlines
 * `process.env.EXPO_PUBLIC_*` at build time by matching the source text; a computed lookup survives
 * the transform untouched and is `undefined` in every bundle.
 */
function apiKey(): string | undefined {
  const value = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return value === undefined || value.length === 0 ? undefined : value;
}

/** Whether a key exists. Never returns, logs, or renders the key itself. */
export function isGeminiConfigured(): boolean {
  return apiKey() !== undefined;
}

export type GeminiError = Error & { httpStatus?: number; isEmpty?: boolean; isTimeout?: boolean };

export function httpStatusOf(error: unknown): number | undefined {
  if (error !== null && typeof error === 'object' && 'httpStatus' in error) {
    const status = (error as GeminiError).httpStatus;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

export function isTimeout(error: unknown): boolean {
  return (
    error !== null && typeof error === 'object' && (error as GeminiError).isTimeout === true
  );
}

/** A 200 that carried no text. Flagged rather than matched on its message, which is display copy. */
export function isEmptyAnswer(error: unknown): boolean {
  return error !== null && typeof error === 'object' && (error as GeminiError).isEmpty === true;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      const timedOut: GeminiError = new Error(`No answer within ${timeoutMs / 1000}s.`);
      timedOut.isTimeout = true;
      throw timedOut;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One attempt at one model. Throws on failure — `llmRouter.ts` is what turns a throw into the
 * `CoachReply` the rest of the app sees, because retrying is its decision, not this file's.
 *
 * The system prompt goes in `system_instruction` rather than being pasted into the first user
 * message the way Legacy does it. Legacy's shape predates the field; it also means the model reads
 * its instructions as something the user said, which is exactly what a prompt is not.
 */
export async function geminiGenerate(
  request: ChatRequest,
  timeoutMs: number,
): Promise<string> {
  const key = apiKey();
  if (key === undefined) {
    const missing: GeminiError = new Error('No key configured.');
    missing.httpStatus = 401;
    throw missing;
  }

  const contents = [
    ...request.history
      .filter((turn) => turn.text.length > 0)
      .map((turn) => ({
        parts: [{ text: turn.text }],
        role: turn.role === 'assistant' ? 'model' : 'user',
      })),
    { parts: [{ text: request.message }], role: 'user' },
  ];

  const response = await fetchWithTimeout(
    `${API_BASE}/${MODEL_ID}:generateContent`,
    {
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.3 },
        system_instruction: { parts: [{ text: request.systemPrompt }] },
      }),
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      method: 'POST',
    },
    timeoutMs,
  );

  if (!response.ok) {
    // The body can echo the request, and the request contains what the user typed. Only the status
    // is kept: an error string is the most likely thing to end up in a log or a screenshot.
    const failed: GeminiError = new Error(`The model answered with ${response.status}.`);
    failed.httpStatus = response.status;
    throw failed;
  }

  const data: unknown = await response.json();
  const text = readFirstText(data);
  if (text === undefined || text.trim().length === 0) {
    const empty: GeminiError = new Error('The model answered with nothing.');
    empty.isEmpty = true;
    throw empty;
  }
  return text;
}

/** `candidates[0].content.parts[0].text`, without trusting any level of it to exist. */
function readFirstText(data: unknown): string | undefined {
  if (data === null || typeof data !== 'object') return undefined;
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return undefined;
  const content = (candidates[0] as { content?: unknown }).content;
  if (content === null || typeof content !== 'object') return undefined;
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts) || parts.length === 0) return undefined;
  const text = (parts[0] as { text?: unknown }).text;
  return typeof text === 'string' ? text : undefined;
}
