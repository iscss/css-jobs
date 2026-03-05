import { describe, it, expect } from 'vitest';
import type { AdminUserProfile } from '@/hooks/useAdminUserProfiles';

// Test the CSV export logic extracted as a pure function
function buildExportCsv(users: Partial<AdminUserProfile>[]) {
  const eligibleUsers = users.filter(
    (u) => u.email_confirmed_at && !u.email_opt_out
  );

  const csvHeader = 'Name,Email,Institution,User Type,Email Opt Out';
  const csvRows = eligibleUsers.map((u) => {
    const name = (u.full_name || '').replace(/,/g, ' ');
    const email = u.email || u.auth_email || '';
    const institution = (u.institution || '').replace(/,/g, ' ');
    const userType = u.user_type || '';
    return `${name},${email},${institution},${userType},false`;
  });

  return [csvHeader, ...csvRows].join('\n');
}

const baseUser: AdminUserProfile = {
  id: '1',
  full_name: 'Test User',
  email: 'test@example.com',
  institution: 'MIT',
  orcid_id: null,
  google_scholar_url: null,
  website_url: null,
  user_type: 'job_seeker',
  approval_status: 'approved',
  is_admin: false,
  is_approved_poster: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  requested_at: null,
  approved_at: null,
  approved_by: null,
  auth_email: 'test@example.com',
  email_confirmed_at: '2024-01-01',
  last_sign_in_at: null,
  auth_created_at: '2024-01-01',
  email_opt_out: false,
  unsubscribe_token: 'abc-123',
};

describe('Email CSV Export Logic', () => {
  it('includes verified opted-in users', () => {
    const csv = buildExportCsv([baseUser]);
    expect(csv).toContain('Test User,test@example.com,MIT,job_seeker,false');
  });

  it('excludes unverified users', () => {
    const csv = buildExportCsv([
      { ...baseUser, email_confirmed_at: null },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('excludes opted-out users', () => {
    const csv = buildExportCsv([
      { ...baseUser, email_opt_out: true },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('includes multiple eligible users', () => {
    const csv = buildExportCsv([
      baseUser,
      { ...baseUser, id: '2', full_name: 'Jane Doe', email: 'jane@example.com' },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 users
  });

  it('handles commas in names and institutions', () => {
    const csv = buildExportCsv([
      { ...baseUser, full_name: 'Last, First', institution: 'University of X, Department Y' },
    ]);
    expect(csv).not.toContain('Last,');
    expect(csv).toContain('Last  First');
    expect(csv).not.toContain('University of X,');
    expect(csv).toContain('University of X  Department Y');
  });

  it('falls back to auth_email when email is null', () => {
    const csv = buildExportCsv([
      { ...baseUser, email: null, auth_email: 'auth@example.com' },
    ]);
    expect(csv).toContain('auth@example.com');
  });

  it('has correct CSV header', () => {
    const csv = buildExportCsv([]);
    expect(csv).toBe('Name,Email,Institution,User Type,Email Opt Out');
  });
});
