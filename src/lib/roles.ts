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
