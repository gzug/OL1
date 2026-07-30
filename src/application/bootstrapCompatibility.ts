import type { HealthReadResult } from '@/core/health';
import type { StorageResult } from '@/core/storage';
import { healthAdapter } from '@/infrastructure/health/healthAdapter';
import { storageAdapter } from '@/infrastructure/storage/storageAdapter';

export type BootstrapCapability = {
  health: string;
};

function createSevenDayRequest() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);

  return {
    metric: 'steps' as const,
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    unit: 'count' as const,
  };
}

export async function getBootstrapCapability(): Promise<BootstrapCapability> {
  const health = await healthAdapter.getCapability();
  return { health: health.capability };
}

export function initializeBootstrapStorage(): Promise<StorageResult> {
  return storageAdapter.initialize();
}

export async function runHealthReadSmoke(): Promise<
  HealthReadResult & { recordCount: number }
> {
  const result = await healthAdapter.read(createSevenDayRequest());
  return { ...result, recordCount: result.data.length };
}
