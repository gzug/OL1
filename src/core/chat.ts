/**
 * What a chat is, as types and ports. No implementations, and — like `src/ui/theme/tokens.ts` —
 * no imports at all, so this file can never join an import cycle.
 *
 * `coachId` is a plain `string` here rather than the catalog's `CoachId`. They are the same type,
 * and reaching from `core` into `ui` to say so would invert the dependency the layers exist to
 * keep straight.
 */

export type ChatRole = 'assistant' | 'user';

export type ChatTurn = {
  readonly id: string;
  readonly role: ChatRole;
  /**
   * An assistant turn with empty text is the optimistic placeholder that renders as "thinking".
   * Ported from Legacy `hooks/chatTurns.ts`, which learned that a placeholder nobody removes on
   * failure is a spinner that never stops.
   */
  readonly text: string;
};

export type ChatThread = {
  /** Empty means the general assistant: no coach, ask anything. */
  readonly coachIds: readonly string[];
  readonly createdAt: string;
  readonly id: string;
  readonly updatedAt: string;
};

/**
 * A thread as the history list needs it: the thread, plus the first thing that was asked in it.
 *
 * The preview is carried here rather than fetched per row, because a list that reads every thread's
 * turns to render one line is one query per row — cheap at three threads and not at three hundred.
 */
export type ChatThreadSummary = ChatThread & {
  /** The first question asked. Empty for a thread that was created and never used. */
  readonly preview: string;
};

export interface ChatStore {
  appendTurn(threadId: string, turn: ChatTurn): Promise<void>;
  /** Idempotent. Thread ids are derived from the coach selection, so "ensure it exists" is the call. */
  createThread(thread: ChatThread): Promise<void>;
  listThreads(): Promise<readonly ChatThreadSummary[]>;
  readTurns(threadId: string): Promise<readonly ChatTurn[]>;
}

/**
 * Why an answer did not arrive. Every one of these is shown to the user in their own words, so the
 * set is deliberately small — a reason nobody can act on may as well be one reason.
 */
export type UnavailableReason =
  | 'empty'
  | 'network'
  | 'not-configured'
  | 'refused'
  | 'timeout';

/**
 * The result of asking for an answer.
 *
 * This shape is the whole point. Legacy's router ends its cascade by RESOLVING with a canned string
 * tagged `metadata.model === 'static-stub'`, so a failed call is structurally identical to a
 * successful one and every caller has to remember to check. `hooks/useChat.ts` remembers; nothing
 * makes the next caller remember. Here a failure has no `text` field to put an apology in, so
 * forgetting to check is a type error rather than a bug that ships.
 */
export type CoachReply =
  | { readonly model: string; readonly status: 'ok'; readonly text: string }
  | { readonly detail?: string; readonly reason: UnavailableReason; readonly status: 'unavailable' };

/**
 * The slice of a coach the chat needs. `src/ui/hubs/catalog.ts`'s `Coach` is assignable to this
 * without either file importing the other — the catalog stays the one list of coaches, and nothing
 * below `src/ui/` has to reach up into it to say so.
 */
export type CoachDescriptor = {
  readonly focus: string;
  readonly id: string;
  readonly name: string;
};

export type ChatRequest = {
  /** Prior turns, oldest first. The pending placeholder is never included. */
  readonly history: readonly ChatTurn[];
  readonly message: string;
  readonly systemPrompt: string;
};

/**
 * A model that answers. `generate` never rejects: an exception is a failure mode the caller has to
 * remember to catch, and this port exists so that failure is a value instead.
 */
export interface ChatModel {
  generate(request: ChatRequest): Promise<CoachReply>;
  isConfigured(): boolean;
}
