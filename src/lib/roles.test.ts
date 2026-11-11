import { describe, it, expect } from 'vitest';
import {
  accessStatusLabel,
  accountRole,
  adminUpdate,
  canOpenPostPage,
  posterUpdate,
  roleBadgeClass,
  roleLabel,
} from './roles';

describe('accountRole', () => {
  it('calls an admin an admin, whatever the stored type says', () => {
    expect(accountRole({ is_admin: true, user_type: 'job_seeker' })).toBe('admin');
    expect(accountRole({ is_admin: true, user_type: 'job_poster', is_approved_poster: true })).toBe('admin');
  });

  it('calls an approved poster a poster even if the stored type is job_seeker', () => {
    expect(accountRole({ is_approved_poster: true, user_type: 'job_seeker' })).toBe('poster');
    expect(accountRole({ is_approved_poster: true, user_type: 'job_poster' })).toBe('poster');
  });

  it('calls a poster who is not approved yet a pending poster', () => {
    expect(accountRole({ user_type: 'job_poster', is_approved_poster: false })).toBe('pending_poster');
    expect(accountRole({ user_type: 'job_poster' })).toBe('pending_poster');
  });

  it.each([null, undefined, {}, { user_type: 'job_seeker' }, { user_type: null, is_admin: false }])(
    'calls %j a member',
    (profile) => {
      expect(accountRole(profile)).toBe('member');
    },
  );
});

describe('roleLabel', () => {
  it('never says Job Seeker', () => {
    const labels = [
      roleLabel({ is_admin: true, user_type: 'job_seeker' }),
      roleLabel({ user_type: 'job_seeker' }),
      roleLabel(null),
    ];
    expect(labels.join(' ')).not.toMatch(/seeker/i);
  });

  it('says what each role is', () => {
    expect(roleLabel({ is_admin: true })).toBe('Admin');
    expect(roleLabel({ is_approved_poster: true })).toBe('Job poster');
    expect(roleLabel({ user_type: 'job_poster', approval_status: 'pending' })).toBe('Job poster (awaiting approval)');
    expect(roleLabel({ user_type: 'job_poster', approval_status: 'rejected' })).toBe('Job poster (not approved)');
    expect(roleLabel({ user_type: 'job_seeker' })).toBe('Member');
  });

  it('gives every role a badge colour', () => {
    expect(roleBadgeClass({ is_admin: true })).toContain('brand-navy');
    expect(roleBadgeClass({ user_type: 'job_seeker' })).toBeTruthy();
  });
});

describe('canOpenPostPage', () => {
  it('lets admins and posters in, including accounts whose stored type is job_seeker', () => {
    expect(canOpenPostPage({ is_admin: true, user_type: 'job_seeker' })).toBe(true);
    expect(canOpenPostPage({ is_approved_poster: true, user_type: 'job_seeker' })).toBe(true);
    expect(canOpenPostPage({ user_type: 'job_poster' })).toBe(true);
  });

  it('keeps plain members out', () => {
    expect(canOpenPostPage({ user_type: 'job_seeker' })).toBe(false);
    expect(canOpenPostPage(null)).toBe(false);
  });
});

describe('posterUpdate', () => {
  it('grants posting and settles the stored status, so nothing is left pending', () => {
    const u = posterUpdate(true, 'admin-1', '2026-11-11T00:00:00Z');
    expect(u).toMatchObject({
      is_approved_poster: true,
      user_type: 'job_poster',
      approval_status: 'approved',
      approved_by: 'admin-1',
      approved_at: '2026-11-11T00:00:00Z',
    });
  });

  it('records a revoke as a rejection, so it is not undone by the sign-up rule', () => {
    expect(posterUpdate(false, 'admin-1')).toEqual({ is_approved_poster: false, approval_status: 'rejected' });
  });

  it('a revoked account reads as "not approved", not as a member or as pending', () => {
    const revoked = { user_type: 'job_poster', ...posterUpdate(false, 'a') };
    expect(accountRole(revoked)).toBe('pending_poster');
    expect(roleLabel(revoked)).toBe('Job poster (not approved)');
    expect(accessStatusLabel(revoked)).toBe('Poster access removed');
  });

  it('a restored account is a plain poster again', () => {
    const restored = posterUpdate(true, 'a');
    expect(accountRole(restored)).toBe('poster');
    expect(accessStatusLabel(restored)).toBeNull();
  });
});

describe('adminUpdate', () => {
  it('settles the request whether admin is granted or removed', () => {
    expect(adminUpdate(true)).toEqual({ is_admin: true, admin_requested_at: null });
    expect(adminUpdate(false)).toEqual({ is_admin: false, admin_requested_at: null });
  });
});

describe('accessStatusLabel', () => {
  it('never says Pending Approval for an admin or a poster, whatever the stored status', () => {
    expect(accessStatusLabel({ is_admin: true, is_approved_poster: true, approval_status: 'pending' })).toBeNull();
    expect(accessStatusLabel({ is_admin: true, approval_status: 'pending' })).toBeNull();
    expect(accessStatusLabel({ is_approved_poster: true, approval_status: 'pending' })).toBeNull();
  });

  it('still reports a genuinely pending account', () => {
    expect(accessStatusLabel({ approval_status: 'pending' })).toBe('Pending Approval');
  });
});
