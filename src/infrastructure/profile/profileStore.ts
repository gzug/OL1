/**
 * The fallback profile store: in memory, for the bundles and tests that have neither SQLite nor a
 * browser. `profileStore.native.ts` and `profileStore.web.ts` are what ship.
 *
 * Same three-file arrangement as `chatStore` and `hubStore`, for the same reason: the tests then
 * cover the shape of the port rather than a mock of it.
 */

import type { Profile, ProfileStore } from '@/core/profile';

export function createMemoryProfileStore(): ProfileStore {
  let held: Profile | null = null;

  return {
    async read() {
      return held;
    },
    async write(profile) {
      held = profile;
    },
  };
}

export const profileStore: ProfileStore = createMemoryProfileStore();
