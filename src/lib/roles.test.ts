import { describe, it, expect } from 'vitest';
import { accountRole, canOpenPostPage, roleBadgeClass, roleLabel } from './roles';

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
