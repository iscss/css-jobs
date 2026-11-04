import { describe, it, expect } from 'vitest';
import { isExistingAccountResponse } from './signup';

describe('isExistingAccountResponse', () => {
  it('spots the empty identities list Supabase returns for an existing account', () => {
    expect(isExistingAccountResponse({ identities: [] })).toBe(true);
  });

  it('lets a real new sign-up through', () => {
    expect(isExistingAccountResponse({ identities: [{ provider: 'email' }] })).toBe(false);
  });

  it.each([null, undefined, {}, { identities: null }, { identities: undefined }])(
    'does not guess when the list is missing: %j',
    (user) => {
      expect(isExistingAccountResponse(user)).toBe(false);
    },
  );
});
