// Reads the organised copy of a job (jobs.structured) safely. The column is
// plain JSON, so check its shape before the page trusts it: anything that does
// not look right means "show the original posting".

export interface OrganisedSection {
  heading: string;
  text: string;
}

export interface OrganisedJob {
  sections: OrganisedSection[];
  pay_range: string | null;
  /** Only ever an http(s) address. */
  application_link: string | null;
}

const MAX_SECTIONS = 30;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;

export function parseStructured(value: unknown): OrganisedJob | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.sections)) return null;

  const sections: OrganisedSection[] = [];
  for (const entry of raw.sections.slice(0, MAX_SECTIONS)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { heading, text: body } = entry as Record<string, unknown>;
    const h = text(heading);
    const t = text(body);
    if (h && t) sections.push({ heading: h, text: t });
  }
  if (sections.length === 0) return null;

  const link = text(raw.application_link);
  return {
    sections,
    pay_range: text(raw.pay_range),
    application_link: link && /^https?:\/\/\S+$/i.test(link) ? link : null,
  };
}
