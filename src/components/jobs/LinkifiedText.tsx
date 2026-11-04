import React from 'react';
import { splitLinks } from '@/lib/linkify';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

// Plain text with web addresses turned into links. Built from React elements,
// never raw HTML, so posting text cannot inject markup.
const LinkifiedText = ({ text, className }: LinkifiedTextProps) => (
  <p className={className}>
    {splitLinks(text).map((part, i) =>
      part.type === 'link' ? (
        <a
          key={i}
          href={part.value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-navy underline underline-offset-2 break-all hover:opacity-80"
        >
          {part.value}
        </a>
      ) : (
        <React.Fragment key={i}>{part.value}</React.Fragment>
      ),
    )}
  </p>
);

export default LinkifiedText;
