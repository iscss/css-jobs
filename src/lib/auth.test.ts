import { describe, it, expect } from 'vitest';
import { isAuthorized, safeEqual } from '../../supabase/functions/_shared/auth';

const serviceKey = 'service-key-'.padEnd(60, 'x');
const schedulerSecret = 'scheduler-secret-'.padEnd(64, 'y');
const keys = { serviceKey, schedulerSecret };

describe('isAuthorized', () => {
  it('accepts the service role key', () => {
    expect(isAuthorized(`Bearer ${serviceKey}`, keys)).toBe(true);
  });

  it('accepts the scheduler secret', () => {
    expect(isAuthorized(`Bearer ${schedulerSecret}`, keys)).toBe(true);
  });

  it.each([null, '', 'Bearer ', 'Bearer wrong', 'Basic abc', serviceKey])(
    'rejects %j',
    (header) => {
      expect(isAuthorized(header, keys)).toBe(false);
    },
  );

  it('ignores a scheduler secret that is not set', () => {
    expect(isAuthorized(`Bearer ${serviceKey}`, { serviceKey })).toBe(true);
    expect(isAuthorized('Bearer undefined', { serviceKey })).toBe(false);
  });

  it('never accepts an empty or short configured value', () => {
    expect(isAuthorized('Bearer ', { serviceKey: '', schedulerSecret: '' })).toBe(false);
    expect(isAuthorized('Bearer short', { serviceKey: 'short', schedulerSecret: 'short' })).toBe(false);
  });

  it('rejects a key that only starts like the real one', () => {
    expect(isAuthorized(`Bearer ${serviceKey}x`, keys)).toBe(false);
    expect(isAuthorized(`Bearer ${serviceKey.slice(0, -1)}`, keys)).toBe(false);
  });
});

describe('safeEqual', () => {
  it('compares whole strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
