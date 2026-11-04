import { describe, it, expect } from 'vitest';
import { parseStructured } from './structured';

const good = {
  sections: [
    { heading: 'Overview', text: 'About the role' },
    { heading: 'How to apply', text: 'Apply at the link' },
  ],
  pay_range: '$50,000 - $70,000',
  application_link: 'https://apply.interfolio.com/186103',
  deadline: { date: '2027-03-01', quote: 'Closes March 1' },
  location: 'Cambridge, MA',
  dropped: [],
};

describe('parseStructured', () => {
  it('reads a well formed copy', () => {
    const r = parseStructured(good);
    expect(r?.sections).toHaveLength(2);
    expect(r?.pay_range).toBe('$50,000 - $70,000');
    expect(r?.application_link).toBe('https://apply.interfolio.com/186103');
  });

  it.each([null, undefined, 'text', 42, [], {}, { sections: 'x' }, { sections: [] }])(
    'shows the original for %j',
    (value) => {
      expect(parseStructured(value)).toBeNull();
    },
  );

  it('skips malformed sections and keeps the good ones', () => {
    const r = parseStructured({ sections: [null, 5, { heading: 'A' }, { heading: '', text: 'x' }, { heading: 'B', text: 'body' }] });
    expect(r?.sections).toEqual([{ heading: 'B', text: 'body' }]);
  });

  it('shows the original when no section is usable', () => {
    expect(parseStructured({ sections: [{ heading: 'A' }] })).toBeNull();
  });

  it.each(['javascript:alert(1)', 'ftp://x.org/a', 'apply here', '//evil.example', 'https://'])(
    'never keeps %j as an application link',
    (link) => {
      expect(parseStructured({ ...good, application_link: link })?.application_link).toBeNull();
    },
  );

  it('caps the number of sections', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ heading: `H${i}`, text: 'x' }));
    expect(parseStructured({ sections: many })?.sections).toHaveLength(30);
  });
});
