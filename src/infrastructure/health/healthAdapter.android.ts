import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import type {
  HealthAdapter,
  HealthCapabilityResult,
  HealthReadRequest,
  HealthReadResult,
} from '@/core/health';

async function getCapability(): Promise<HealthCapabilityResult> {
  try {
    const sdkStatus = await getSdkStatus();
    if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return { capability: 'update-required', status: 'unavailable' };
    }
    if (sdkStatus !== SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { capability: 'unavailable', status: 'unavailable' };
    }
    return { capability: 'available', status: 'ok' };
  } catch {
    return { capability: 'unavailable', status: 'error' };
  }
}

async function read(request: HealthReadRequest): Promise<HealthReadResult> {
  const capability = await getCapability();
  if (capability.status !== 'ok') {
    return { capability: capability.capability, data: [], request, status: capability.status };
  }

  try {
    const initialized = await initialize();
    if (!initialized) {
      return { capability: 'unavailable', data: [], request, status: 'unavailable' };
    }

    const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    const canReadSteps = granted.some(
      (permission) =>
        permission.accessType === 'read' && permission.recordType === 'Steps',
    );
    if (!canReadSteps) {
      return { capability: 'available', data: [], request, status: 'unavailable' };
    }

    const result = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: request.range.start,
        endTime: request.range.end,
      },
      ascendingOrder: true,
    });

    const data = result.records.map((record) => ({
      start: record.startTime,
      end: record.endTime,
      value: record.count,
      unit: request.unit,
      source: record.metadata?.dataOrigin ?? 'unknown',
      provenance: 'health-connect' as const,
    }));

    return {
      capability: 'available',
      data,
      request,
      status: data.length > 0 ? 'ok' : 'empty',
    };
  } catch {
    return { capability: 'available', data: [], request, status: 'error' };
  }
}

export const healthAdapter: HealthAdapter = {
  getCapability,
  read,
};
