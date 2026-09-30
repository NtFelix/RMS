/**
 * Helpers for presenting the storage usage of an organisation.
 * The used bytes come pre-computed from `Organisation.speicher_bytes`.
 */

const STORAGE_NEAR_LIMIT_PERCENTAGE = 80;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export interface StorageUsageState {
  /** Usage in percent, capped at 100. 0 when there is no positive limit. */
  percentage: number;
  /** A positive storage limit exists. */
  hasLimit: boolean;
  /** The plan explicitly includes no storage (limit 0). */
  hasNoStorageAccess: boolean;
  isOverLimit: boolean;
  isNearLimit: boolean;
  level: 'over' | 'near' | 'ok';
}

/**
 * @param usedBytes Used storage in bytes.
 * @param limitBytes Plan limit in bytes, 0 = no storage included, null/undefined = unlimited or unknown.
 */
export function getStorageUsageState(
  usedBytes: number,
  limitBytes: number | null | undefined
): StorageUsageState {
  const hasLimit = typeof limitBytes === 'number' && limitBytes > 0;
  const hasNoStorageAccess = limitBytes === 0;

  const percentage = hasLimit ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
  const isOverLimit = (hasLimit && usedBytes >= limitBytes) || hasNoStorageAccess;
  const isNearLimit = hasLimit && !isOverLimit && percentage >= STORAGE_NEAR_LIMIT_PERCENTAGE;

  const level = isOverLimit ? 'over' : isNearLimit ? 'near' : 'ok';

  return { percentage, hasLimit, hasNoStorageAccess, isOverLimit, isNearLimit, level };
}
