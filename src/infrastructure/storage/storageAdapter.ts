import type { StorageAdapter } from '@/core/storage';
import { CURRENT_SCHEMA_VERSION } from '@/infrastructure/storage/schema';

export const storageAdapter: StorageAdapter = {
  async initialize() {
    return { schemaVersion: CURRENT_SCHEMA_VERSION, status: 'ok' };
  },
};
