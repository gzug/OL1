/**
 * The only thing a screen calls to hold a conversation.
 *
 * Screens and routes never reach past this file — SQLite, `localStorage` and the Gemini REST call
 * all sit behind it, which is the boundary `scripts/check-boundaries.mjs` enforces.
 *
 * **Persist-first ordering**, ported from Legacy `hooks/useChat.ts`: the typed message is written
 * before the prompt is built and before the model is called. What the person typed is the one
 * unrecoverable input in the whole exchange — everything else can be produced again.
 *
 * That ordering is why `persist` and `answer` are separate calls rather than one `send`. The bar on
 * Home persists and navigates; the chat screen picks up the thread, finds a user turn with nothing
 * after it, and answers it. **A persisted user turn with no reply is the whole handoff** — the same
 * shape Legacy documented as its crash-recovery case, doing a second job here. Nothing the person
 * typed ever travels in a URL to get between the two screens.
 *
 * **Every call names its thread as of 2026-08-19.** These used to take coach ids and derive the
 * thread from them, which made one conversation per coach selection and no way to have a second.
 * See `threads.ts` for why that changed. `resume` is the one place that still starts from coaches,
 * for the surfaces that legitimately know who but not which — a link that names coaches, or a hub's
 * coach door.
 */

import type { Attachment, AttachmentRef } from '@/core/attachments';
import type {
  ChatModel,
  ChatStore,
  ChatThreadSummary,
  ChatTurn,
  CoachDescriptor,
  CoachReply,
} from '@/core/chat';
import { chatStore as defaultStore } from '@/infrastructure/chat/chatStore';
import { createChatModel } from '@/infrastructure/llm/llmRouter';

import type { CoachContext } from './context';
import { systemPromptFor } from './prompt';
import { latestFor, newThreadId } from './threads';

const defaultModel = createChatModel();

/** Short, and collision-resistant enough for one device's chat history. Legacy's shape. */
function turnId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type CoachChat = {
  /** Read the last turn's question and answer it. Returns null when nothing is waiting. */
  answer(
    threadId: string,
    coaches: readonly CoachDescriptor[],
    attachment?: Attachment,
    /** The hub's brief, when this conversation is inside one. Absent at the Open Table. */
    brief?: string | null,
    /**
     * What the app holds about the person, read at the moment of asking. Absent means a caller that
     * has not read the store, and the prompt then says it knows nothing — see `prompt.ts`.
     */
    context?: CoachContext | null,
  ): Promise<CoachReply | null>;
  isConfigured(): boolean;
  listThreads(): Promise<readonly ChatThreadSummary[]>;
  /** Write the question. Always completes before anything is asked of the model. */
  persist(
    threadId: string,
    coachIds: readonly string[],
    text: string,
    attachment?: AttachmentRef,
  ): Promise<void>;
  readTurns(threadId: string): Promise<readonly ChatTurn[]>;
  /**
   * The conversation these coaches continue, starting a new one if there is none.
   *
   * For the surfaces that know WHO is at the table but not WHICH conversation: a link carrying
   * coach ids, and a hub's coach door. Everywhere the person picked a conversation — the history
   * list, a hub's recent three — names its thread outright and never comes through here.
   */
  resume(coachIds: readonly string[]): Promise<string>;
  /** A fresh conversation with these coaches. What the bar on Home does on every send. */
  start(coachIds: readonly string[]): Promise<string>;
};

export function createCoachChat(
  model: ChatModel = defaultModel,
  store: ChatStore = defaultStore,
): CoachChat {
  /**
   * A local function rather than `this.start` inside the object below. `this` is bound only while
   * the method is reached through the object, and every one of these is a candidate for being
   * destructured into a hook's dependency list — where `this` would be undefined and `resume` would
   * throw on exactly the path that starts someone's first conversation.
   */
  async function start(coachIds: readonly string[]): Promise<string> {
    const id = newThreadId();
    const now = new Date().toISOString();
    await store.createThread({ coachIds, createdAt: now, id, updatedAt: now });
    return id;
  }

  return {
    async answer(threadId, coaches, attachment, brief, context) {
      const turns = await store.readTurns(threadId);
      const last = turns[turns.length - 1];

      // Nothing waiting. Reopening a finished conversation must not re-ask its last question.
      if (last === undefined || last.role !== 'user') return null;

      const reply = await model.generate({
        attachment,
        history: turns.slice(0, -1),
        message: last.text,
        /**
         * The hub's brief, when the conversation is inside one, and what the app holds about the
         * person. Both reach the model fenced, as data rather than as instructions — see
         * `briefSection` and `contextSection` for why, and why `SAFETY` follows both.
         */
        systemPrompt: systemPromptFor(coaches, brief, context),
      });

      // Only a real answer is persisted. Writing the failure copy as an assistant turn would put
      // "couldn't reach your coach" permanently into the transcript, where on the next open it is
      // indistinguishable from something a coach actually said — and it would also mark the
      // question as answered, so reopening could never retry it.
      if (reply.status === 'ok') {
        await store.appendTurn(threadId, { id: turnId(), role: 'assistant', text: reply.text });
      }

      return reply;
    },

    isConfigured: () => model.isConfigured(),

    listThreads: () => store.listThreads(),

    async persist(threadId, coachIds, text, attachment) {
      const now = new Date().toISOString();
      await store.createThread({ coachIds, createdAt: now, id: threadId, updatedAt: now });
      await store.appendTurn(threadId, {
        ...(attachment === undefined ? {} : { attachment }),
        id: turnId(),
        role: 'user',
        text,
      });
    },

    readTurns(threadId) {
      return store.readTurns(threadId);
    },

    async resume(coachIds) {
      const existing = latestFor(await store.listThreads(), coachIds);
      return existing?.id ?? start(coachIds);
    },

    start,
  };
}

export const coachChat: CoachChat = createCoachChat();
