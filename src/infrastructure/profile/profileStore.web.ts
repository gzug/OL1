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
      return JSON.parse(raw) as Profile;
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
