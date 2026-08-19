/**
 * The conversation, as state a screen can render.
 *
 * Two things are ported from Legacy `hooks/useChat.ts` rather than re-derived:
 *
 * - **The optimistic empty assistant turn** appended on send, which renders as "thinking" and is
 *   removed again by `dropPendingTurn` when generation ends without an answer.
 * - **The mounted guard on every post-await state write.** Generation takes seconds and the person
 *   can leave; the store write still completes, only the UI update is skipped.
 *
 * The auto-answer on load is this file's own, and it does two jobs with one rule: *a thread whose
 * last turn is a question gets answered*. That is how the bar on Home hands over to this screen
 * without putting what was typed into a URL, and it is also what makes an interrupted send recover
 * when the conversation is opened again.
 *
 * **It takes a thread now, not just coaches.** `threadId` names the conversation outright — what a
 * history row or a hub's recent three hand over. `null` means "the one these coaches were last in,
 * or a new one", which is what a link carrying only coach ids can honestly ask for. Resolving that
 * is async, so nothing is read until it settles: the screen shows its loading state rather than
 * briefly showing an empty conversation that then fills in.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Attachment } from '@/core/attachments';
import type { ChatTurn, CoachDescriptor, UnavailableReason } from '@/core/chat';
import { takeHeld, toRef } from '@/application/chat/attachments';
import { coachChat } from '@/application/chat/coachChat';

import { dropPendingTurn, resolvePendingTurn } from './chatTurns';

export type ChatStatus = 'generating' | 'loading' | 'ready';

export function useCoachChat(threadId: string | null, coaches: readonly CoachDescriptor[]) {
  const [turns, setTurns] = useState<readonly ChatTurn[]>([]);
  const [status, setStatus] = useState<ChatStatus>('loading');
  const [problem, setProblem] = useState<UnavailableReason | null>(null);
  /** The conversation actually being read and written. Resolved from the coaches when none is named. */
  const [openThread, setOpenThread] = useState<string | null>(threadId);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The identity of `coaches` changes on every render at most call sites; its contents are what
  // decide which thread this is. Keying the effect on the joined ids is what stops a reload loop.
  const coachKey = coaches.map((coach) => coach.id).join(',');

  const answer = useCallback(async (thread: string, attachment?: Attachment) => {
    setStatus('generating');
    setTurns((current) => [...current, { id: 'pending', role: 'assistant', text: '' }]);

    const reply = await coachChat.answer(thread, coaches, attachment);

    if (!mounted.current) return;
    if (reply === null || reply.status === 'unavailable') {
      setTurns(dropPendingTurn);
      setProblem(reply === null ? null : reply.reason);
    } else {
      setTurns((current) => resolvePendingTurn(current, reply.text));
      setProblem(null);
    }
    setStatus('ready');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contents, not identity; see coachKey.
  }, [coachKey]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setStatus('loading');
      // A named thread is opened as named. Without one, the coaches decide — their most recent
      // conversation, or a new one. `resume` is the only place a conversation is chosen for you.
      const thread = threadId ?? (await coachChat.resume(coaches.map((coach) => coach.id)));
      if (cancelled || !mounted.current) return;
      setOpenThread(thread);

      const stored = await coachChat.readTurns(thread);
      if (cancelled || !mounted.current) return;
      setTurns(stored);
      setStatus('ready');

      const last = stored[stored.length - 1];
      // `takeHeld` is the other half of the handoff from Home's bar: the question came through the
      // store, the bytes came through memory, and this is where they meet again.
      if (last?.role === 'user') await answer(thread, takeHeld());
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contents, not identity; see coachKey.
  }, [answer, coachKey, threadId]);

  const send = useCallback(
    async (text: string, attachment?: Attachment) => {
      const trimmed = text.trim();
      // An attachment on its own is a message. "Look at this" with a photo needs no sentence.
      if ((trimmed.length === 0 && attachment === undefined) || status === 'generating') return;

      // Sending before the thread has resolved would write into a conversation nobody is reading.
      // The bar is disabled while loading, so this is the belt to that screen's braces.
      if (openThread === null) return;

      await coachChat.persist(
        openThread,
        coaches.map((coach) => coach.id),
        trimmed,
        attachment === undefined ? undefined : toRef(attachment),
      );
      if (!mounted.current) return;
      setTurns((current) => [
        ...current,
        {
          ...(attachment === undefined ? {} : { attachment: toRef(attachment) }),
          id: `sent-${current.length}`,
          role: 'user',
          text: trimmed,
        },
      ]);
      await answer(openThread, attachment);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contents, not identity; see coachKey.
    [answer, coachKey, openThread, status],
  );

  return { problem, send, status, threadId: openThread, turns };
}
