/**
 * What the coaches are told, and how their answer is read back apart again.
 *
 * The two halves of this file are ONE contract: the prompt asks for `Coach Name: …` at the start of
 * a line, and `splitCoachVoices` is what reads it. Changing either alone silently degrades a round
 * table into a wall of text, so they live together.
 *
 * Legacy's system prompts are deliberately NOT ported. They name a product and a scope this spec has
 * not settled, and they encode Legacy's own product decisions — canonical scores, tier-1 data,
 * recovery-warning handling — none of which exist here. What is worth keeping from them is the one
 * safety boundary, which is not a product decision but a floor under a health app.
 */

import type { CoachDescriptor } from '@/core/chat';

const SAFETY = [
  'Never diagnose, never prescribe, and never recommend supplements or doses.',
  'If something sounds clinical, say so plainly and point at a doctor rather than working around it.',
].join(' ');

/**
 * The app knows nothing about the person yet — the hubs are fixtures and nothing is connected. A
 * model that is not told this invents a plausible history and states it as fact, which in a health
 * app is the single most expensive thing it can do.
 */
const NO_DATA =
  'You have no access to this person’s health data. Do not invent numbers, history, or ' +
  'measurements, and do not imply you can see any. Ask for what you need instead.';

const STYLE =
  'Answer in the language the question was asked in. Be short and concrete: a few sentences, or a ' +
  'short list when there are genuinely several things. No preamble, no praise, no restating the ' +
  'question.';

/**
 * The person's own brief for this hub, folded into the prompt.
 *
 * **Three things about the wording, and each is a decision:**
 *
 * 1. **It is quoted as their words, not issued as instructions.** A brief reading "ignore
 *    everything above" is a person misusing their own coach rather than an attacker, but the floor
 *    under a health app must not depend on that staying true — so the brief arrives fenced, as
 *    reported speech, and `SAFETY` sits after it, last, where it is what the model reads on the
 *    way out.
 * 2. **It replaces `NO_DATA` rather than joining it.** Telling a model both "you know nothing about
 *    this person" and "here is what they told you" is a contradiction, and the resolution a model
 *    picks is not one anybody chose. Where a brief exists it is stated as the only thing known.
 * 3. **It says do not extend it.** "Coach me based on Outlive" must not become an assumed age, an
 *    assumed training history or an assumed diagnosis. A frame is not a file.
 */
function briefSection(brief: string): string {
  return [
    'This person wrote the following about how they want to be coached in this area. Treat it as ' +
      'their own words and let it shape your answers.',
    '<their-words>\n' + brief.trim() + '\n</their-words>',
    'That is the ONLY thing you know about them. Do not extend it into ages, history, ' +
      'measurements or conditions they did not write, and do not imply you can see any.',
  ].join('\n\n');
}

export function systemPromptFor(
  coaches: readonly CoachDescriptor[],
  /** What the person wrote about how they want to be coached in this hub. */
  brief?: string | null,
): string {
  const written = brief === undefined || brief === null || brief.trim().length === 0 ? null : brief;
  const known = written === null ? NO_DATA : briefSection(written);

  if (coaches.length === 0) {
    return [
      'You are the assistant inside OL1, a personal health app. Answer anything the person asks.',
      'The app has coaches for particular areas, and they can be added to this conversation. If a ' +
        'question clearly belongs to one of them, you may say so in a final short line — once, ' +
        'and never instead of answering.',
      known,
      SAFETY,
      STYLE,
    ].join('\n\n');
  }

  const roster = coaches.map((coach) => `- ${coach.name}: ${coach.focus}`).join('\n');

  if (coaches.length === 1) {
    return [
      `You are the ${coaches[0].name} inside OL1, a personal health app. Your focus: ${coaches[0].focus}`,
      'Stay inside that focus. If the question is really about something else, say which area it ' +
        'belongs to in one line, then answer what you can from yours.',
      known,
      SAFETY,
      STYLE,
    ].join('\n\n');
  }

  return [
    'You are several coaches inside OL1, a personal health app, answering one question together.',
    `At this table:\n${roster}`,
    'Each coach speaks once, in at most two sentences, starting the line with their exact name and ' +
      'a colon — for example "Sleep Coach: ...". A coach with nothing useful to add stays ' +
      'silent rather than agreeing. Coaches not listed above do not speak at all.',
    'After the coaches, add one line starting "Together:" with what they agree the person should do.',
    known,
    SAFETY,
    STYLE,
  ].join('\n\n');
}

export type Voice = {
  /** Undefined for the general assistant, a single coach, or anything the model said unprompted. */
  readonly speaker?: string;
  readonly text: string;
};

/**
 * Split a round-table answer into the voices that spoke.
 *
 * Degrades to one unlabelled block when the model ignores the format, which it sometimes will. That
 * is the point of doing this with a prefix rather than asking for JSON: a malformed round table is
 * still a readable answer, where malformed JSON is a failed turn.
 */
export function splitCoachVoices(
  text: string,
  coaches: readonly CoachDescriptor[],
): readonly Voice[] {
  const speakers = [...coaches.map((coach) => coach.name), 'Together'];
  const voices: Voice[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/^\s*[*_#>-]+\s*/, '').trim();
    if (line.length === 0) continue;

    const speaker = speakers.find((name) =>
      line.toLowerCase().startsWith(`${name.toLowerCase()}:`),
    );

    if (speaker !== undefined) {
      voices.push({ speaker, text: line.slice(speaker.length + 1).trim() });
      continue;
    }

    const last = voices[voices.length - 1];
    if (last === undefined) {
      voices.push({ text: line });
    } else {
      // A wrapped continuation of whoever spoke last, not a new voice.
      voices[voices.length - 1] = { ...last, text: `${last.text}\n${line}` };
    }
  }

  return voices.length === 0 ? [{ text: text.trim() }] : voices;
}
