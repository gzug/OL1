export type HealthResultStatus = 'ok' | 'empty' | 'unavailable' | 'error';
export type HealthCapability = 'available' | 'unavailable' | 'update-required';
export type HealthMetric = 'steps';
export type HealthUnit = 'count';

export type HealthRange = {
  start: string;
  end: string;
};

export type HealthReadRequest = {
  metric: HealthMetric;
  range: HealthRange;
  timezone: string;
  unit: HealthUnit;
};

export type HealthDataPoint = {
  start: string;
  end: string;
  value: number;
  unit: HealthUnit;
  source: string;
  provenance: 'health-connect' | 'fixture';
};

export type HealthCapabilityResult = {
  capability: HealthCapability;
  status: Extract<HealthResultStatus, 'ok' | 'unavailable' | 'error'>;
};

export type HealthReadResult = {
  capability: HealthCapability;
  data: HealthDataPoint[];
  request: HealthReadRequest;
  status: HealthResultStatus;
};

export interface HealthAdapter {
  getCapability(): Promise<HealthCapabilityResult>;
  read(request: HealthReadRequest): Promise<HealthReadResult>;
}
