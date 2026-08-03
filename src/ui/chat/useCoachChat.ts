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
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatTurn, CoachDescriptor, UnavailableReason } from '@/core/chat';
import { coachChat } from '@/application/chat/coachChat';

import { dropPendingTurn, resolvePendingTurn } from './chatTurns';

export type ChatStatus = 'generating' | 'loading' | 'ready';

export function useCoachChat(coaches: readonly CoachDescriptor[]) {
  const [turns, setTurns] = useState<readonly ChatTurn[]>([]);
  const [status, setStatus] = useState<ChatStatus>('loading');
  const [problem, setProblem] = useState<UnavailableReason | null>(null);

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

  const answer = useCallback(async () => {
    setStatus('generating');
    setTurns((current) => [...current, { id: 'pending', role: 'assistant', text: '' }]);

    const reply = await coachChat.answer(coaches);

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
      const stored = await coachChat.readTurns(coaches.map((coach) => coach.id));
      if (cancelled || !mounted.current) return;
      setTurns(stored);
      setStatus('ready');

      const last = stored[stored.length - 1];
      if (last?.role === 'user') await answer();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contents, not identity; see coachKey.
  }, [coachKey, answer]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || status === 'generating') return;

      await coachChat.persist(
        coaches.map((coach) => coach.id),
        trimmed,
      );
      if (!mounted.current) return;
      setTurns((current) => [...current, { id: `sent-${current.length}`, role: 'user', text: trimmed }]);
      await answer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contents, not identity; see coachKey.
    [answer, coachKey, status],
  );

  return { problem, send, status, turns };
}
