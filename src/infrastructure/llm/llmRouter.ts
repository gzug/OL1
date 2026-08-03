/**
 * Retry policy, and the one place a failure becomes a value.
 *
 * PORTED from Legacy `data/llm/llmRouter.ts` + `modelRoutingConfig.ts`, collapsed to what OL1
 * actually has: one provider, one model. What survives is the part that earns its keep —
 * **retry on 429 and 5xx, stop dead on 401 and 403** — and the 60/45/30s timeout ladder.
 *
 * Three things deliberately did not come across:
 *
 * 1. **The task-type routing table, OpenRouter, and the local Llama tier.** OL1 has one model. A
 *    routing table with one destination is a lookup that can only ever be wrong.
 * 2. **The static-stub tail.** Legacy's cascade ends by RESOLVING with a canned apology tagged
 *    `metadata.model === 'static-stub'`, which is a failure wearing a success's clothes. Every
 *    caller has to remember to check; `useChat.ts` does, and nothing makes the next one. Here
 *    exhaustion returns `status: 'unavailable'`, which has no `text` to mistake for an answer.
 * 3. **Retrying after a timeout.** Legacy's ladder made sense because each tier was a *different,
 *    faster* model — 45s on tier two was a smaller model getting less time. With one model, a call
 *    that had nothing to say in 60s has nothing to say in 45s either, so a timeout is final. The
 *    shrinking ladder is kept for the retryable cases, where it is now a total-time budget: three
 *    attempts cost at most 135s rather than 180s, and the user is not held by a struggling call for
 *    three minutes.
 */

import type { ChatModel, ChatRequest, CoachReply, UnavailableReason } from '@/core/chat';

import {
  MODEL_ID,
  geminiGenerate,
  httpStatusOf,
  isEmptyAnswer,
  isGeminiConfigured,
  isTimeout,
} from './geminiAdapter';

/** Legacy's per-tier timeouts, unchanged. See the file header for what they mean here. */
export const TIER_TIMEOUTS_MS = [60_000, 45_000, 30_000] as const;

/** Worth trying again: rate limits and the provider having a bad minute. */
export const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** Not worth trying again: the key is missing, wrong, or restricted. Cascading only hides it. */
export const FATAL_STATUS = new Set([401, 403]);

/** One attempt at one model. Injected so the policy above can be tested without a network. */
export type Attempt = (request: ChatRequest, timeoutMs: number) => Promise<string>;

function reasonFor(error: unknown): UnavailableReason {
  if (isTimeout(error)) return 'timeout';
  if (isEmptyAnswer(error)) return 'empty';
  const status = httpStatusOf(error);
  if (status !== undefined && FATAL_STATUS.has(status)) return 'refused';
  return 'network';
}

export function createChatModel(
  options: { attempt?: Attempt; configured?: () => boolean } = {},
): ChatModel {
  const attempt = options.attempt ?? geminiGenerate;
  const configured = options.configured ?? isGeminiConfigured;

  return {
    async generate(request: ChatRequest): Promise<CoachReply> {
      if (!configured()) {
        return { reason: 'not-configured', status: 'unavailable' };
      }

      let last: unknown;

      for (const timeoutMs of TIER_TIMEOUTS_MS) {
        try {
          const text = await attempt(request, timeoutMs);
          return { model: MODEL_ID, status: 'ok', text };
        } catch (error) {
          last = error;

          if (isTimeout(error)) break;

          const status = httpStatusOf(error);
          if (status !== undefined && FATAL_STATUS.has(status)) break;
          if (status !== undefined && !RETRYABLE_STATUS.has(status)) break;
          // A thrown Error with no status is a network fault or an unreadable body. Both are worth
          // one more try, which is the one case where "no status" is treated as retryable.
        }
      }

      return { reason: reasonFor(last), status: 'unavailable' };
    },

    isConfigured: configured,
  };
}
