import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Unsubscribe from './Unsubscribe';

// Mock supabase client
const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function renderWithRouter(searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/unsubscribe${searchParams}`]}>
      <Unsubscribe />
    </MemoryRouter>
  );
}

describe('Unsubscribe Page', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('shows error when no token is provided', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('No unsubscribe token provided.')).toBeInTheDocument();
    });
  });

  it('shows success message on valid token', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    renderWithRouter('?token=valid-uuid');

    await waitFor(() => {
      expect(screen.getByText('Unsubscribed')).toBeInTheDocument();
      expect(screen.getByText('You have been successfully unsubscribed from CSS Jobs emails.')).toBeInTheDocument();
    });

    expect(mockRpc).toHaveBeenCalledWith('handle_unsubscribe', { token: 'valid-uuid' });
  });

  it('shows error message on invalid token', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    renderWithRouter('?token=invalid');

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('This unsubscribe link is not valid.')).toBeInTheDocument();
    });
  });

  it('shows error message on RPC failure', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

    renderWithRouter('?token=some-uuid');

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument();
    });
  });

  it('shows loading state initially with a valid token', () => {
    mockRpc.mockReturnValue(new Promise(() => {})); // never resolves

    renderWithRouter('?token=some-uuid');

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('has a link back to the homepage', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    renderWithRouter('?token=valid-uuid');

    await waitFor(() => {
      expect(screen.getByText('Unsubscribed')).toBeInTheDocument();
    });

    const homeLink = screen.getByText('Go to CSS Jobs');
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
