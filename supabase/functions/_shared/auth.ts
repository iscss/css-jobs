// Who may call the scheduled functions (ingest-jobs, check-listings,
// rescore-jobs). They run with the platform's JWT check off, because the caller
// is the database scheduler and not a signed-in user, so each function checks
// the caller itself.
//
// Two credentials are accepted:
//   - the project's service role key (SUPABASE_SERVICE_ROLE_KEY);
//   - SCHEDULER_SECRET, a random value set with `supabase secrets set`, made for
//     the scheduler. It can be rotated without touching the service key, and
//     works where the key the dashboard shows differs from the one the
//     function is given.
// Anything shorter than MIN_SECRET_LENGTH is never accepted, so an empty or
// placeholder value cannot open the door.

export const MIN_SECRET_LENGTH = 32;

const encoder = new TextEncoder();

// Compare without stopping at the first difference.
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);
  for (let i = 0; i < length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function isAuthorized(
  authHeader: string | null,
  keys: { serviceKey?: string; schedulerSecret?: string },
): boolean {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return false;
  return [keys.serviceKey, keys.schedulerSecret]
    .filter((key): key is string => !!key && key.length >= MIN_SECRET_LENGTH)
    .some((key) => safeEqual(token, key));
}
