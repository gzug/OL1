/**
 * What the body figure draws: this week's sessions, turned into per-muscle load.
 *
 * A hook because the sessions come from the store, and a hook rather than a call inside the figure
 * because `BodyFigure` should be given what to draw rather than go looking for it — that is what
 * lets Home render the same figure from the same numbers without a second read.
 *
 * **Two kinds of entry feed it**, and they are not equal. A `session` is what was logged; a `worked`
 * entry is a muscle the person tapped on the figure itself. The tapped one wins, because they were
 * there and nothing here was — see `muscleLoad`'s note on hand-marked muscles.
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  muscleLoad,
  type LoggedSession,
  type MuscleLoad,
  type MuscleSlug,
} from '@/application/twin/muscleLoad';

const EMPTY: MuscleLoad = { counted: 0, loads: {}, unplaced: 0 };

/**
 * **`read` is the difference between "you logged nothing" and "I have not looked".**
 *
 * The figure's caption said "Nothing logged in the last seven days, so nothing is marked" from an
 * `EMPTY` that also meant *the first render, before any query* and *the store would not open*. All
 * three rendered the same claim about a person's training, and two of them had no business making
 * one at all.
 *
 * The whole class is `docs/decisions/0013-a-sentence-that-outlived-its-truth.md`, shape 1.
 */
export type LoadedMuscles = MuscleLoad & {
  readonly read: boolean;
  /**
   * Read it again, now.
   *
   * **Without this the figure was a dead control.** Tapping a muscle wrote the entry correctly and
   * the colour it produced was correct — but `useFocusEffect` only fires when a screen gains focus,
   * and tapping something on a screen you are already looking at does not do that. So the write
   * landed, the figure did not move, and the muscle appeared the next time the Twin was opened.
   *
   * The owner reported it as "clicking on a muscle group to change the colour still doesn't work",
   * and he was right about the symptom: everything worked except looking again.
   */
  readonly reread: () => void;
};

/** The hub a session belongs to. Exercise holds everything that moves, per the ring the owner drew. */
export const SESSION_HUB = 'exercise';

function toSession(entry: {
  kind: string;
  payload: Readonly<Record<string, unknown>>;
  recordedAt: string;
}): LoggedSession | null {
  if (entry.kind === 'worked') {
    const marked = entry.payload.muscles;
    if (!Array.isArray(marked) || marked.length === 0) return null;
    return { at: entry.recordedAt, kind: 'worked', muscles: marked as MuscleSlug[] };
  }

  if (entry.kind !== 'session') return null;
  const activity = entry.payload.activity;
  const minutes = entry.payload.minutes;
  return {
    at: entry.recordedAt,
    kind: typeof activity === 'string' ? activity : '',
    // A payload out of a database is a claim, not a guarantee. `effort` treats anything it cannot
    // use as an ordinary session rather than as nothing.
    minutes: typeof minutes === 'number' ? minutes : undefined,
  };
}

export function useMuscleLoad(source = defaultHubs): LoadedMuscles {
  const [load, setLoad] = useState<MuscleLoad & { read: boolean }>({ ...EMPTY, read: false });

  /**
   * Which read is current.
   *
   * A tap is followed by a re-read while the screen still has focus, so the effect's own cancel flag
   * cannot cover it — that flag belongs to one run of the effect, and `reread` is called from
   * outside any of them.
   */
  const current = useRef(0);

  const reread = useCallback(() => {
    const run = (current.current += 1);

    void source
      .entries(SESSION_HUB)
      .then((entries) => {
        if (run !== current.current) return;
        const sessions = entries
          .map(toSession)
          .filter((session): session is LoggedSession => session !== null);
        setLoad({ ...muscleLoad(sessions, new Date().toISOString()), read: true });
      })
      .catch(() => {
        // A store that cannot be read leaves the figure unmarked, which is what "we do not know"
        // looks like. Marking it from nothing would be the one thing this must never do.
      });
  }, [source]);

  useFocusEffect(
    useCallback(() => {
      reread();
      return () => {
        current.current += 1;
      };
    }, [reread]),
  );

  return { ...load, reread };
}
