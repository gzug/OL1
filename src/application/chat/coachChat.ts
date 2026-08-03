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
 */

import type {
  ChatModel,
  ChatStore,
  ChatThread,
  ChatTurn,
  CoachDescriptor,
  CoachReply,
} from '@/core/chat';
import { chatStore as defaultStore } from '@/infrastructure/chat/chatStore';
import { createChatModel } from '@/infrastructure/llm/llmRouter';

import { systemPromptFor } from './prompt';
import { threadIdFor } from './threads';

const defaultModel = createChatModel();

/** Short, and collision-resistant enough for one device's chat history. Legacy's shape. */
function turnId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type CoachChat = {
  /** Read the last turn's question and answer it. Returns null when nothing is waiting. */
  answer(coaches: readonly CoachDescriptor[]): Promise<CoachReply | null>;
  isConfigured(): boolean;
  listThreads(): Promise<readonly ChatThread[]>;
  /** Write the question. Always completes before anything is asked of the model. */
  persist(coachIds: readonly string[], text: string): Promise<void>;
  readTurns(coachIds: readonly string[]): Promise<readonly ChatTurn[]>;
};

export function createCoachChat(
  model: ChatModel = defaultModel,
  store: ChatStore = defaultStore,
): CoachChat {
  return {
    async answer(coaches) {
      const coachIds = coaches.map((coach) => coach.id);
      const threadId = threadIdFor(coachIds);
      const turns = await store.readTurns(threadId);
      const last = turns[turns.length - 1];

      // Nothing waiting. Reopening a finished conversation must not re-ask its last question.
      if (last === undefined || last.role !== 'user') return null;

      const reply = await model.generate({
        history: turns.slice(0, -1),
        message: last.text,
        systemPrompt: systemPromptFor(coaches),
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

    async persist(coachIds, text) {
      const threadId = threadIdFor(coachIds);
      const now = new Date().toISOString();
      await store.createThread({ coachIds, createdAt: now, id: threadId, updatedAt: now });
      await store.appendTurn(threadId, { id: turnId(), role: 'user', text });
    },

    readTurns(coachIds) {
      return store.readTurns(threadIdFor(coachIds));
    },
  };
}

export const coachChat: CoachChat = createCoachChat();
