import { formatFileSize, getStorageUsageState } from '@/lib/storage-usage';

describe('formatFileSize', () => {
  it('formats zero, invalid and negative values as 0 B', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-5)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
  });

  it('formats bytes, kilobytes, megabytes and gigabytes', () => {
    expect(formatFileSize(512)).toBe('512.00 B');
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
    expect(formatFileSize(1024 ** 3)).toBe('1.00 GB');
  });

  it('does not exceed the largest unit', () => {
    expect(formatFileSize(1024 ** 5)).toBe('1024.00 TB');
  });
});

describe('getStorageUsageState', () => {
  const GB = 1024 ** 3;

  it('reports normal usage below the near-limit threshold', () => {
    const state = getStorageUsageState(0.5 * GB, GB);
    expect(state).toMatchObject({
      hasLimit: true,
      hasNoStorageAccess: false,
      isOverLimit: false,
      isNearLimit: false,
      level: 'ok',
    });
    expect(state.percentage).toBeCloseTo(50);
  });

  it('flags near-limit usage from 80 percent', () => {
    expect(getStorageUsageState(0.8 * GB, GB)).toMatchObject({ isNearLimit: true, level: 'near' });
    expect(getStorageUsageState(0.79 * GB, GB).isNearLimit).toBe(false);
  });

  it('flags usage at or above the limit as over limit and caps the percentage', () => {
    const state = getStorageUsageState(2 * GB, GB);
    expect(state.isOverLimit).toBe(true);
    expect(state.isNearLimit).toBe(false);
    expect(state.level).toBe('over');
    expect(state.percentage).toBe(100);
    expect(getStorageUsageState(GB, GB).isOverLimit).toBe(true);
  });

  it('treats a limit of 0 as no storage included', () => {
    const state = getStorageUsageState(0, 0);
    expect(state.hasNoStorageAccess).toBe(true);
    expect(state.hasLimit).toBe(false);
    expect(state.isOverLimit).toBe(true);
  });

  it('treats null or undefined limits as unlimited without warnings', () => {
    for (const limit of [null, undefined]) {
      const state = getStorageUsageState(10 * GB, limit);
      expect(state).toMatchObject({
        hasLimit: false,
        hasNoStorageAccess: false,
        isOverLimit: false,
        isNearLimit: false,
        percentage: 0,
      });
    }
  });
});
