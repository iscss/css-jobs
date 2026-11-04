// A job has to say how to apply: an application link, a contact email, or both.
// Without one the job is published with nothing for an applicant to click.

export const APPLY_METHOD_MESSAGE =
  'Add an application link or a contact email (at least one) so people can apply.';

export function hasApplyMethod(values: {
  application_url?: string | null;
  contact_email?: string | null;
}): boolean {
  return Boolean(values.application_url?.trim() || values.contact_email?.trim());
}
