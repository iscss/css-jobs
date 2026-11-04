import { describe, it, expect } from 'vitest';
import { splitLinks } from './linkify';

const links = (text: string) =>
  splitLinks(text).filter((p) => p.type === 'link').map((p) => p.value);

describe('splitLinks', () => {
  it('links the address in the Interfolio example', () => {
    const text = 'Applications should be submitted by a separate link: https://apply.interfolio.com/186103';
    expect(links(text)).toEqual(['https://apply.interfolio.com/186103']);
    expect(splitLinks(text)[0]).toEqual({
      type: 'text',
      value: 'Applications should be submitted by a separate link: ',
    });
  });

  it('keeps the text on both sides and rebuilds the original', () => {
    const text = 'Apply at https://example.org/jobs/1 by Friday, or email us.';
    expect(splitLinks(text).map((p) => p.value).join('')).toBe(text);
  });

  it.each([
    ['See https://example.org/a.', 'https://example.org/a'],
    ['(https://example.org/a)', 'https://example.org/a'],
    ['Go to https://example.org/a, then apply', 'https://example.org/a'],
    ['"https://example.org/a"', 'https://example.org/a'],
  ])('drops trailing punctuation: %s', (text, expected) => {
    expect(links(text)).toEqual([expected]);
  });

  it('keeps query strings and paths', () => {
    expect(links('https://x.org/apply?job=12&ref=a#top')).toEqual(['https://x.org/apply?job=12&ref=a#top']);
  });

  it('finds several links', () => {
    expect(links('a https://a.org b http://b.org c')).toEqual(['https://a.org', 'http://b.org']);
  });

  it('never links other schemes', () => {
    expect(links('javascript:alert(1) and ftp://x.org and mailto:a@b.org')).toEqual([]);
  });

  it('returns plain text unchanged', () => {
    expect(splitLinks('nothing to link')).toEqual([{ type: 'text', value: 'nothing to link' }]);
    expect(splitLinks('')).toEqual([]);
  });
});
