import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LegacyJobsRedirect from './LegacyJobsRedirect';

const Where = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname}{search}</div>;
};

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<Where />} />
        <Route path="/jobs" element={<LegacyJobsRedirect />} />
      </Routes>
    </MemoryRouter>,
  );

describe('LegacyJobsRedirect', () => {
  it('sends /jobs to /', () => {
    renderAt('/jobs');
    expect(screen.getByTestId('where').textContent).toBe('/');
  });

  it('keeps the search query when redirecting', () => {
    renderAt('/jobs?search=postdoc');
    expect(screen.getByTestId('where').textContent).toBe('/?search=postdoc');
  });

  it('leaves / alone', () => {
    renderAt('/');
    expect(screen.getByTestId('where').textContent).toBe('/');
  });
});
