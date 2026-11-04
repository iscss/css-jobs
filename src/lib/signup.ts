// When confirmation emails are on, Supabase answers a sign-up for an address that
// already has an account with a normal-looking success, creates nothing and sends
// nothing. The one sign is an empty `identities` list on the returned user. Treat
// that as "already registered" so the form does not claim an account was created.

export function isExistingAccountResponse(
  user: { identities?: unknown[] | null } | null | undefined,
): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}
