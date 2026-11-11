// What an account is, worked out from what it can do rather than from the stored
// `user_type`. The stored type was set at sign-up ("job_seeker" by default), so an
// admin or an approved poster could still read as a "job seeker" on the profile
// page, and the header and post page refused them the post form.
//
// Order matters: an admin is an admin whatever the stored type says.

export type AccountRole = 'admin' | 'poster' | 'pending_poster' | 'member';

interface RoleFields {
  is_admin?: boolean | null;
  is_approved_poster?: boolean | null;
  user_type?: string | null;
  approval_status?: string | null;
}

export function accountRole(profile: RoleFields | null | undefined): AccountRole {
  if (profile?.is_admin) return 'admin';
  if (profile?.is_approved_poster) return 'poster';
  if (profile?.user_type === 'job_poster') return 'pending_poster';
  return 'member';
}

export function roleLabel(profile: RoleFields | null | undefined): string {
  switch (accountRole(profile)) {
    case 'admin': return 'Admin';
    case 'poster': return 'Job poster';
    case 'pending_poster':
      return profile?.approval_status === 'rejected'
        ? 'Job poster (not approved)'
        : 'Job poster (awaiting approval)';
    default: return 'Member';
  }
}

export function roleBadgeClass(profile: RoleFields | null | undefined): string {
  switch (accountRole(profile)) {
    case 'admin': return 'bg-brand-navy text-white';
    case 'poster': return 'bg-green-100 text-green-800';
    case 'pending_poster': return 'bg-amber-100 text-amber-800';
    default: return 'bg-brand-surface-2 text-brand-navy';
  }
}

/** Who gets the post-a-job form. The form itself still blocks an unapproved poster. */
export function canOpenPostPage(profile: RoleFields | null | undefined): boolean {
  return accountRole(profile) !== 'member';
}

// What an admin's button writes to the profile. Keeping these in one place means the
// stored status can never disagree with the flags (a granted admin used to keep the
// "pending" status from sign-up and show "Pending Approval").

/** Switch posting on (restoring it after a revoke) or off. A revoke is recorded as a rejection. */
export function posterUpdate(
  grant: boolean,
  adminId: string,
  now: string = new Date().toISOString(),
) {
  return grant
    ? {
        is_approved_poster: true,
        user_type: 'job_poster',
        approval_status: 'approved',
        approved_by: adminId,
        approved_at: now,
      }
    : {
        is_approved_poster: false,
        approval_status: 'rejected',
      };
}

/** Grant or remove admin. Either way a pending request for it is settled. */
export function adminUpdate(grant: boolean) {
  return { is_admin: grant, admin_requested_at: null };
}

/** The label that replaces "Pending Approval" in the user list. Only flags and the stored status matter. */
export function accessStatusLabel(profile: RoleFields | null | undefined): string | null {
  if (profile?.is_admin || profile?.is_approved_poster) return null;
  if (profile?.approval_status === 'rejected') return 'Poster access removed';
  if (profile?.approval_status === 'pending') return 'Pending Approval';
  return null;
}

/**
 * The user counts on the admin dashboard. They partition the accounts, so
 * admins + posters + removed always equals total: an admin is counted once as an
 * admin (not also as a poster), and "removed" is everyone left over, which is an
 * account whose posting access an admin took away.
 */
export function userCounts(users: RoleFields[] | null | undefined) {
  const list = users ?? [];
  const admins = list.filter((u) => accountRole(u) === 'admin').length;
  const posters = list.filter((u) => accountRole(u) === 'poster').length;
  return { total: list.length, admins, posters, removed: list.length - admins - posters };
}

/**
 * An admin can delete any account except their own. Deleting another admin is
 * allowed on purpose: because you cannot delete yourself, at least one admin
 * (the one doing the deleting) always remains.
 */
export function canDeleteUser(targetId: string, currentUserId: string | null | undefined): boolean {
  return !!currentUserId && targetId !== currentUserId;
}
