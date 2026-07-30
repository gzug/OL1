import type { HealthAdapter } from '@/core/health';

export const healthAdapter: HealthAdapter = {
  async getCapability() {
    return { capability: 'available', status: 'ok' };
  },
  async read(request) {
    const data = [
      {
        start: request.range.start,
        end: request.range.end,
        value: 6400,
        unit: request.unit,
        source: 'controlled-preview-fixture',
        provenance: 'fixture' as const,
      },
    ];
    return { capability: 'available', data, request, status: 'ok' };
  },
};
