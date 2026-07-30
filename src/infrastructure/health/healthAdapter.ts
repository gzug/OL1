import type { HealthAdapter } from '@/core/health';

export const healthAdapter: HealthAdapter = {
  async getCapability() {
    return { capability: 'unavailable', status: 'unavailable' };
  },
  async read(request) {
    return { capability: 'unavailable', data: [], request, status: 'unavailable' };
  },
};
