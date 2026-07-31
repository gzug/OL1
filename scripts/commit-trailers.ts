/**
 * Decides whether every commit says which agent produced it.
 *
 * Why a trailer and not the author field: the predecessor repository recorded agent authorship
 * in `%an` (Claude, Don, gzug). A squash merge rewrites the author to whoever merged, so on main
 * that attribution is gone. A trailer in the commit body survives the squash.
 *
 * Pure on purpose — see change-rationale.ts.
 */

export type CommitMessage = {
  body: string;
  sha: string;
  subject: string;
};

export type TrailerVerdict = {
  missing: CommitMessage[];
  ok: boolean;
};

/** `none` is a value, not an absence, so "a human wrote this" and "I forgot" stay different. */
export const KNOWN_AGENTS = ['claude-code', 'codex', 'gemini', 'none'];

const TRAILER = /^Agent:[ \t]*(\S.*)$/m;

export function readTrailer(body: string): string | null {
  const match = TRAILER.exec(body);
  return match ? match[1].trim() : null;
}

export function evaluate(commits: CommitMessage[]): TrailerVerdict {
  const missing = commits.filter((commit) => readTrailer(commit.body) === null);
  return { missing, ok: missing.length === 0 };
}
