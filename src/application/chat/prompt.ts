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

import { contextSection, fenced, type CoachContext } from './context';

const SAFETY = [
  'Never diagnose, never prescribe, and never recommend supplements or doses.',
  'If something sounds clinical, say so plainly and point at a doctor rather than working around it.',
].join(' ');

/**
 * What a coach is told when the app really does hold nothing.
 *
 * **This used to be what EVERY coach was told, and by 2026-08-22 it was false.** The comment here
 * said "the hubs are fixtures and nothing is connected", which was true the day it was written.
 * Six hubs now hold typed data — a session, a panel, a meal, a night, how a day felt, a condition,
 * a medication — and a person who typed their blood panel in could open the Longevity Guide and be
 * asked what their markers were.
 *
 * It survives because the sentence is still exactly right in the case it now covers: nothing in the
 * store, nothing in the profile, nothing from the first run. A model that is not told this invents
 * a plausible history and states it as fact, which in a health app is the single most expensive
 * thing it can do.
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
 *    picks is not one anybody chose.
 * 3. **It says do not extend it.** "Coach me based on Outlive" must not become an assumed age, an
 *    assumed training history or an assumed diagnosis. A frame is not a file.
 *
 * **The third of those moved out of this function on 2026-08-22.** It used to end here with "That
 * is the ONLY thing you know about them", which stopped being true the moment the hubs could also
 * be read: the prompt would have claimed exclusivity for the brief while a whole block of hub facts
 * sat beside it, and the resolution a model picks for that contradiction is again not one anybody
 * chose. It is now `DO_NOT_EXTEND`, issued once, after every block that carries something known.
 */
function briefSection(brief: string): string {
  return [
    'This person wrote the following about how they want to be coached in this area. Treat it as ' +
      'their own words and let it shape your answers.',
    '<their-words>\n' + fenced(brief.trim()) + '\n</their-words>',
  ].join('\n\n');
}

/**
 * The one sentence that closes whatever was known, however many blocks that took.
 *
 * Issued once rather than per block, because said three times it reads as three separate rules and
 * a model obeys the nearest. Said last, it is about all of them.
 */
const DO_NOT_EXTEND =
  'That is everything you know about them. Do not extend it into ages, history, measurements or ' +
  'conditions they did not give, and do not imply you can see anything that is not there.';

/**
 * Everything the app can honestly say it knows, or the admission that it knows nothing.
 *
 * **Order matters and is deliberate.** The brief is a frame and is read first, because a frame is
 * read before the thing it frames. The facts follow, carrying their own refusals. Then the one
 * closing sentence, and then — in the caller — `SAFETY`, last. The person's own free text therefore
 * sits earliest, with every guard in the prompt after it rather than before.
 */
function whatIsKnown(brief: string | null, context: CoachContext | null): string {
  const sections = [
    ...(brief === null ? [] : [briefSection(brief)]),
    ...(context === null ? [] : [contextSection(context)]),
  ].filter((section): section is string => section !== null);

  return sections.length === 0 ? NO_DATA : [...sections, DO_NOT_EXTEND].join('\n\n');
}

export function systemPromptFor(
  coaches: readonly CoachDescriptor[],
  /** What the person wrote about how they want to be coached in this hub. */
  brief?: string | null,
  /**
   * What the app holds about them: the hub cockpits, what each hub can and cannot see, and the
   * answers the first run collected. Absent where a caller has not read the store — a bare call
   * still produces the prompt that says it knows nothing, which is then true of that prompt.
   */
  context?: CoachContext | null,
): string {
  const written = brief === undefined || brief === null || brief.trim().length === 0 ? null : brief;
  const known = whatIsKnown(written, context ?? null);

  if (coaches.length === 0) {
    return [
      'You are the assistant inside One L1fe, a personal health app. Answer anything the person asks.',
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
      `You are the ${coaches[0].name} inside One L1fe, a personal health app. Your focus: ${coaches[0].focus}`,
      'Stay inside that focus. If the question is really about something else, say which area it ' +
        'belongs to in one line, then answer what you can from yours.',
      known,
      SAFETY,
      STYLE,
    ].join('\n\n');
  }

  return [
    'You are several coaches inside One L1fe, a personal health app, answering one question together.',
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
