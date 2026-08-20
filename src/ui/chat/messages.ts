/**
 * What the person reads when there is no answer.
 *
 * Every line says what happened and what to do about it, in that order, and none of them says
 * "error". `not-configured` is the one the preview shows today, and it is the deliberate steady
 * state rather than an unfinished setup — `docs/decisions/0010-the-coaches-stay-off.md`. It is also
 * the live path, so it is the one line here that cannot rot unseen.
 */

import type { UnavailableReason } from '@/core/chat';

export function unavailableMessage(reason: UnavailableReason): string {
  switch (reason) {
    case 'empty':
      return 'Nothing came back. Ask again, or put it a different way.';
    case 'network':
      return 'Could not reach the coaches. Check your connection and ask again.';
    case 'not-configured':
      return 'The coaches are not switched on yet. Everything else here works; answers do not.';
    case 'refused':
      return 'The coaches turned the question away. This is a setup problem, not something you did.';
    case 'timeout':
      return 'That took too long and was given up on. Ask again.';
  }
}
