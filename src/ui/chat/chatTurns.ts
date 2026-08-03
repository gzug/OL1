/**
 * The optimistic-placeholder lifecycle, kept pure so it can be asserted without a hook, a store or
 * a network in the room.
 *
 * PORTED near-verbatim from Legacy `apps/mobile/src/hooks/chatTurns.ts`, whose comment records what
 * it was written for: on send, an empty-text assistant turn is appended so a "thinking" line
 * renders. That placeholder MUST come off again when generation ends without a reply — a failed
 * call and a user-initiated stop both used to leave a spinner running forever.
 *
 * On success the placeholder is replaced by the answer, so this is a no-op there: the trailing
 * assistant turn already has text.
 */

import type { ChatTurn } from '@/core/chat';

/** An assistant turn with no text is the placeholder, and the only thing that renders as thinking. */
export function isPending(turn: ChatTurn | undefined): boolean {
  return turn !== undefined && turn.role === 'assistant' && turn.text.length === 0;
}

/**
 * Drop a single trailing empty assistant turn, if there is one. A trailing assistant turn that
 * already has text (a real answer), a trailing user turn (the persisted-without-reply shape), and
 * every earlier turn are left alone. Returns a new array; never mutates.
 */
export function dropPendingTurn(turns: readonly ChatTurn[]): readonly ChatTurn[] {
  return isPending(turns[turns.length - 1]) ? turns.slice(0, -1) : turns;
}

/** Put the answer where the placeholder was. Appends instead if the placeholder is already gone. */
export function resolvePendingTurn(
  turns: readonly ChatTurn[],
  text: string,
): readonly ChatTurn[] {
  const last = turns[turns.length - 1];
  if (last === undefined || !isPending(last)) {
    return [...turns, { id: `resolved-${turns.length}`, role: 'assistant', text }];
  }
  return [...turns.slice(0, -1), { ...last, text }];
}
