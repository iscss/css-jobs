// Split plain text into text and http(s) link parts, so a posting that says
// "apply at https://..." can show a real link. Only http and https are linked.

export type TextPart = { type: 'text' | 'link'; value: string };

const URL_PATTERN = /https?:\/\/[^\s<>"]+/gi;
// Punctuation that ends a sentence rather than the address.
const TRAILING = /[.,;:!?'")\]}]+$/;

export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    // A closing bracket is dropped too, so "(https://x.org/a)" links x.org/a.
    const url = match[0].replace(TRAILING, '') || match[0];

    if (start > last) parts.push({ type: 'text', value: text.slice(last, start) });
    parts.push({ type: 'link', value: url });
    last = start + url.length;
  }

  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}
