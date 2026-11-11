import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

// The profile settings page, drawn for each kind of account. The point: an admin
// or a job poster must never be shown a "Job Seeker" option or label.

let mockProfile: Record<string, unknown> | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'me@example.org' } }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: mockProfile, isLoading: false }),
  useUpdateUserProfile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const base = {
  id: 'u1',
  full_name: 'Test Person',
  institution: 'Test University',
  approval_status: 'approved',
  approved_jobs_count: 0,
  can_publish_directly: false,
};

const accounts: Record<string, Record<string, unknown>> = {
  'an admin stored as a job seeker': { ...base, is_admin: true, user_type: 'job_seeker', is_approved_poster: false },
  'an admin stored as a job poster': { ...base, is_admin: true, user_type: 'job_poster', is_approved_poster: true },
  'an approved poster stored as a job seeker': { ...base, is_admin: false, user_type: 'job_seeker', is_approved_poster: true },
  'an approved poster': { ...base, is_admin: false, user_type: 'job_poster', is_approved_poster: true },
  'a poster awaiting approval': { ...base, is_admin: false, user_type: 'job_poster', is_approved_poster: false, approval_status: 'pending' },
  'a poster who was not approved': { ...base, is_admin: false, user_type: 'job_poster', is_approved_poster: false, approval_status: 'rejected' },
};

describe('profile settings', () => {
  beforeEach(() => {
    mockProfile = null;
  });

  it.each(Object.keys(accounts))('never offers or names "Job Seeker" for %s', (name) => {
    mockProfile = accounts[name];
    const { container } = render(<UserProfile />);
    expect(container.textContent).not.toMatch(/seeker/i);
    expect(container.querySelectorAll('[role="radio"], input[type="radio"]')).toHaveLength(0);
    expect(screen.queryByText(/request job posting access/i)).toBeNull();
  });

  it('shows an admin as Admin', () => {
    mockProfile = accounts['an admin stored as a job seeker'];
    render(<UserProfile />);
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText(/you can publish jobs directly and manage users/i)).toBeTruthy();
  });

  it('shows an approved poster as a Job poster, whatever the stored type says', () => {
    mockProfile = accounts['an approved poster stored as a job seeker'];
    render(<UserProfile />);
    expect(screen.getByText('Job poster')).toBeTruthy();
  });

  it('shows a poster who is not approved yet as awaiting approval', () => {
    mockProfile = accounts['a poster awaiting approval'];
    render(<UserProfile />);
    expect(screen.getByText('Job poster (awaiting approval)')).toBeTruthy();
  });

  it('lets a poster ask for admin access', () => {
    mockProfile = accounts['an approved poster'];
    render(<UserProfile />);
    expect(screen.getByRole('button', { name: /request admin access/i })).toBeTruthy();
  });

  it('shows that an admin request is waiting, and does not offer it twice', () => {
    mockProfile = { ...accounts['an approved poster'], admin_requested_at: '2026-11-11T10:00:00Z' };
    render(<UserProfile />);
    expect(screen.queryByRole('button', { name: /request admin access/i })).toBeNull();
    expect(screen.getByText(/you have asked for admin access/i)).toBeTruthy();
  });

  it('does not offer admin access to an admin', () => {
    mockProfile = accounts['an admin stored as a job poster'];
    render(<UserProfile />);
    expect(screen.queryByRole('button', { name: /request admin access/i })).toBeNull();
  });

  it('tells an account whose posting was removed to contact an admin, with no way to ask again', () => {
    mockProfile = accounts['a poster who was not approved'];
    const { container } = render(<UserProfile />);
    expect(screen.getByText(/posting access has been removed/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /request/i })).toBeNull();
    expect(container.textContent).not.toMatch(/seeker/i);
  });

  it('never shows the old posting-access request', () => {
    mockProfile = { ...base, is_admin: false, user_type: 'job_seeker', is_approved_poster: false };
    const { container } = render(<UserProfile />);
    expect(screen.queryByText(/request job posting access/i)).toBeNull();
    expect(container.textContent).not.toMatch(/seeker/i);
  });
});
