import { describe, it, expect } from 'vitest';
import { hasApplyMethod } from './applyMethod';

describe('hasApplyMethod', () => {
  it('accepts a link, an email, or both', () => {
    expect(hasApplyMethod({ application_url: 'https://x.org/apply' })).toBe(true);
    expect(hasApplyMethod({ contact_email: 'jobs@x.org' })).toBe(true);
    expect(hasApplyMethod({ application_url: 'https://x.org/apply', contact_email: 'jobs@x.org' })).toBe(true);
  });

  it.each([
    {},
    { application_url: '', contact_email: '' },
    { application_url: '   ', contact_email: '  ' },
    { application_url: null, contact_email: null },
    { application_url: undefined, contact_email: undefined },
  ])('rejects %j', (values) => {
    expect(hasApplyMethod(values)).toBe(false);
  });
});
