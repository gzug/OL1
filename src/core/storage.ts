export type StorageResult =
  | {
      schemaVersion: number;
      status: 'ok';
    }
  | {
      schemaVersion: null;
      status: 'error';
    };

export interface StorageAdapter {
  initialize(): Promise<StorageResult>;
}
