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
import { useCallback, useState } from 'react';

import { hubs as defaultHubs } from '@/application/hubs/hubs';
import {
  muscleLoad,
  type LoggedSession,
  type MuscleLoad,
  type MuscleSlug,
} from '@/application/twin/muscleLoad';

const EMPTY: MuscleLoad = { counted: 0, loads: {}, unplaced: 0 };

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

export function useMuscleLoad(source = defaultHubs): MuscleLoad {
  const [load, setLoad] = useState<MuscleLoad>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void source
        .entries(SESSION_HUB)
        .then((entries) => {
          if (cancelled) return;
          const sessions = entries
            .map(toSession)
            .filter((session): session is LoggedSession => session !== null);
          setLoad(muscleLoad(sessions, new Date().toISOString()));
        })
        .catch(() => {
          // A store that cannot be read leaves the figure unmarked, which is what "we do not know"
          // looks like. Marking it from nothing would be the one thing this must never do.
        });

      return () => {
        cancelled = true;
      };
    }, [source]),
  );

  return load;
}
