import DOMPurify from 'dompurify';

// Configure DOMPurify for safe HTML sanitization
const createDOMPurify = () => {
  if (typeof window !== 'undefined') {
    return DOMPurify(window);
  }
  return DOMPurify;
};

const purify = createDOMPurify();

// Sanitize HTML content - removes all script tags and dangerous attributes
export const sanitizeHtml = (dirty: string): string => {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  });
};

// Sanitize plain text - strips all HTML
export const sanitizeText = (text: string): string => {
  return purify.sanitize(text, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
};

// Validate and sanitize URL
export const sanitizeUrl = (url: string): string => {
  const sanitized = sanitizeText(url);
  try {
    const urlObj = new URL(sanitized);
    // Only allow http and https protocols
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return urlObj.toString();
    }
  } catch {
    // Invalid URL
  }
  return '';
};

// Validate email format
export const sanitizeEmail = (email: string): string => {
  const sanitized = sanitizeText(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
};

// General input validation with length limits
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  const sanitized = sanitizeText(input);
  return sanitized.slice(0, maxLength);
};