/**
 * The profile on the web preview, in `localStorage`.
 *
 * The same guarded access and the same honesty as `chatStore.web.ts` and `hubStore.web.ts`: this is
 * a preview convenience, not durable storage. Expo's static export prerenders in Node where
 * `window` does not exist, so every access is guarded or `export:web` fails.
 */

import type { Profile, ProfileStore } from '@/core/profile';

const KEY = 'ol1.profile';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const profileStore: ProfileStore = {
  async read() {
    const store = storage();
    if (store === null) return null;

    const raw = store.getItem(KEY);
    if (raw === null) return null;

    try {
      /**
       * Normalised rather than cast. A profile written before `heightCm` existed parses without
       * one, and `as Profile` would hand a screen an `undefined` its type says cannot happen —
       * the same lie in the browser that a missing column tells on a phone.
       */
      const parsed = JSON.parse(raw) as Partial<Profile>;
      return {
        birthYear: parsed.birthYear ?? null,
        heightCm: parsed.heightCm ?? null,
        sex: parsed.sex ?? 'preferNotToSay',
        updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      };
    } catch {
      // A half-written value is not worth crashing a screen over, and a profile that will not parse
      // is the same as none: the age calculation returns null and says so.
      return null;
    }
  },

  async write(profile) {
    const store = storage();
    if (store === null) return;
    try {
      store.setItem(KEY, JSON.stringify(profile));
    } catch {
      // Quota exceeded. What is on screen stays; only its persistence is lost.
    }
  },
};
