// Shared helpers for automated job ingestion.
//
// Every adapter produces RawJob values; normalizeJob turns those into rows that
// satisfy the jobs table constraints, and rejects anything that cannot.
// Keeping the validation here means a new source cannot bypass it.

export interface RawJob {
  title: string;
  institution: string;
  location: string;
  description: string;
  jobType?: string;
  sourceUrl: string;
  sourceJobId?: string;
  applicationUrl?: string;
  postedAt?: string;
}

export type JobType =
  | 'PhD'
  | 'Postdoc'
  | 'Faculty'
  | 'Research Assistant'
  | 'Internship'
  | 'Other';

export interface NormalizedJob {
  title: string;
  institution: string;
  location: string;
  description: string;
  job_type: JobType;
  application_url: string | null;
  source: string;
  source_url: string;
  source_job_id: string | null;
  content_hash: string;
  relevance_score: number;
  relevance_reasoning: string;
  is_auto_imported: true;
  posted_by: string;
  posted_at: string | null;
  application_deadline: string | null;
}

// Mirrors the CHECK constraints in the initial schema. Violating any of these
// raises a Postgres error, so they are enforced before insert instead.
const TITLE_MIN = 5;
const TITLE_MAX = 200;
const INSTITUTION_MIN = 2;
const INSTITUTION_MAX = 200;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 10000;

export class SkippedJobError extends Error {}

/** A listing whose posting date is older than the freshness window. */
export class StaleJobError extends Error {}

// Feeds carry dates in several shapes: RFC-2822 (RSS pubDate), ISO-8601
// (Workday startDate), and human strings ("Posted 13 Days Ago"). Return an
// ISO date string, or null when nothing parseable is present.
export function parsePostedAt(
  raw: string | undefined,
  now: Date = new Date(),
): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;

  // "Posted 13 Days Ago" / "Posted 30+ Days Ago" / "Posted Today"
  const relative = text.match(/posted\s+(today|yesterday|(\d+)\+?\s*days?)/i);
  if (relative) {
    const days = relative[1].toLowerCase().startsWith('today')
      ? 0
      : relative[1].toLowerCase().startsWith('yesterday')
      ? 1
      : Number(relative[2]);
    if (Number.isFinite(days)) {
      const d = new Date(now.getTime() - days * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  // A date far in the future is a parse artefact, not a real posting date.
  if (parsed.getTime() > now.getTime() + 86400000 * 365) return null;
  return parsed.toISOString().slice(0, 10);
}

// Many postings state their own closing date in the body. Reading it lets the
// board hide roles that have actually closed, rather than guessing from age.
const DEADLINE_PATTERNS: RegExp[] = [
  /(?:application|submission)\s+deadline\s*(?:is|:)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})(?![0-9])/i,
  /(?:application|submission)\s+deadline\s*(?:is|:)?\s*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})(?![0-9])/i,
  /(?:apply|applications?)\s+by\s*:?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})(?![0-9])/i,
  /(?:apply|applications?)\s+by\s*:?\s*([A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})(?![0-9])/i,
  /clos(?:es|ing)(?:\s+date)?\s*(?:on|:)?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})(?![0-9])/i,
  /deadline\s*(?:is|:)?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
];

export function extractDeadline(
  description: string,
  now: Date = new Date(),
): string | null {
  const text = description.slice(0, 4000);
  for (const pattern of DEADLINE_PATTERNS) {
    const hit = text.match(pattern);
    if (!hit?.[1]) continue;
    const raw = hit[1].replace(/,/g, '').trim();
    // JS silently reads "20226" as 2022, so validate the year token itself
    // rather than trusting Date to reject a typo.
    const year = raw.match(/\b(\d{4,})\b/);
    if (!year || year[1].length !== 4) continue;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) continue;
    // Ignore absurd values (typos like "2 August 20226").
    const years = (parsed.getTime() - now.getTime()) / (86400000 * 365);
    if (years > 5 || years < -20) continue;
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  eacute: 'é',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
};

// Feeds escape entities in titles as well as bodies, so this runs over both.
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) =>
      NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/(p|div|h[1-6]|ul|ol|tr)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clamp(value: string, max: number): string {
  if (value.length <= max) return value;
  // Prefer cutting at a word boundary so truncation is not mid-word.
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.8 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

export function mapJobType(raw: string | undefined, title: string): JobType {
  const haystack = `${raw ?? ''} ${title}`.toLowerCase();

  if (/\bph\.?d\b|doctoral (student|position|researcher)|\bdphil\b/.test(haystack)) {
    return 'PhD';
  }
  if (/post-?doc|postdoctoral|research fellow/.test(haystack)) return 'Postdoc';
  if (/\bprofessor\b|faculty|lecturer|tenure|reader\b/.test(haystack)) {
    return 'Faculty';
  }
  if (/research (assistant|technician|associate)|\bRA\b/.test(haystack)) {
    return 'Research Assistant';
  }
  if (/intern(ship)?\b|\btrainee\b/.test(haystack)) return 'Internship';
  return 'Other';
}

// Relevance scoring. This only orders the review queue — nothing is ever
// discarded on the strength of a score, so a miss costs queue position, not a
// lost job. Deliberately keyword based to keep ingestion free of API cost;
// swap this one function for an LLM call if better ordering is worth the spend.
//
// The model is multiplicative, not additive: computational social science is
// the *intersection* of a computational method and a social/behavioural
// subject. Scoring those independently ranks any quantitative science job
// highly — a seismology postdoc mentioning machine learning would outrank a
// computational sociology position that never says "ML". So method words score
// almost nothing on their own and only pay off alongside a social subject.

// Unambiguous field names. These are CSS by definition, so they alone qualify.
const EXPLICIT_FIELD: [RegExp, number][] = [
  [/computational social scien|social data scien/i, 1.0],
  [/computational (sociolog|political|communication|demograph|linguist)/i, 0.95],
  [/social computing|computational human behaviou?r/i, 0.9],
  [/digital (sociolog|humanities)|quantitative social scien/i, 0.85],
];

// Computational methods. Weight reflects how CSS-specific each one is:
// agent-based modelling is rare outside social simulation, whereas "machine
// learning" appears in nearly every science posting.
const METHOD_SIGNALS: [RegExp, number][] = [
  [/agent-based model|social simulation/i, 1.0],
  [/social network analysis|network scien/i, 0.9],
  [/digital trace data|computational text analysis|text as data/i, 0.9],
  [/large language model|\bLLM\b|natural language processing|\bNLP\b/i, 0.6],
  [/network analysis|graph analysis/i, 0.6],
  [/machine learning|deep learning|data scien|statistical model|econometric/i, 0.45],
  [/quantitative method|computational method|simulation/i, 0.4],
];

// Social / behavioural subject matter. Without one of these, a method match is
// almost certainly a natural-science job.
const SOCIAL_SIGNALS: [RegExp, number][] = [
  [/sociolog|political scien|politics|communication scien/i, 1.0],
  [/social media|social network|online communit|misinformation|polarizat/i, 0.9],
  [/human behaviou?r|social behaviou?r|collective behaviou?r/i, 0.9],
  [/demograph|public opinion|electoral|voting|civic/i, 0.85],
  [/computational psycholog|behaviou?ral scien|cognitive scien/i, 0.7],
  [/economic|labou?r market|inequality|migration|urban stud/i, 0.6],
  [/social scien|survey data|panel data|census/i, 0.6],
  [/reinforcement learning.{0,40}social|social.{0,40}reinforcement learning/i, 0.8],
];

// Domains that are definitively not CSS. These zero the score outright rather
// than subtracting, because a pharma or geoscience posting that happens to say
// "machine learning" should not sit anywhere near the top of the queue.
const DISQUALIFYING: RegExp[] = [
  /immunolog|oncolog|molecular biolog|biochem|genom|proteom|zebrafish|in vitro/i,
  /seismic|ionospher|geophys|astronom|astrophys|climate model|atmospher/i,
  /medicinal chemistry|organic chemistry|drug discovery|pharmacokinetic/i,
  /clinical trial|patient recruit|nursing|radiolog|surgical/i,
  /social media (manager|coordinator|executive|assistant|intern)\b/i,
  /marketing|sales representative|fundraising|advancement officer/i,
  // Health/medical AI is a distinct field from CSS. Without this, any centre
  // for "AI in Medicine" scores on its methods plus stray subject words in
  // boilerplate (department lists, equal-opportunity statements).
  /\bAI in medicine\b|medical (imaging|informatics)|healthcare AI|patient care/i,
  /microbiolog|formulation scien|purification|beamline|remote sensing/i,
];

// Titles that describe running a centre rather than doing research. These
// routinely mention every method and discipline the centre touches.
const ADMIN_ROLE = /\b(operational|administrative|procurement|audits|infrastructure support)\b/i;

export function scoreRelevance(
  title: string,
  description: string,
): { score: number; reasoning: string } {
  // The title states what the role is; the description may only mention methods
  // in passing, so title matches count for more.
  const titleText = title;
  const fullText = `${title} ${description}`;
  // Subject matching uses only the title and the opening of the description.
  // Long postings list unrelated departments, equal-opportunity statements and
  // centre blurbs, and matching those produced false positives like a medical
  // AI admin role scoring on a stray mention of sociology.
  const subjectText = `${title} ${description.slice(0, 900)}`;
  const matched: string[] = [];

  const best = (
    signals: [RegExp, number][],
    text: string,
  ): { weight: number; label: string } => {
    let weight = 0;
    let label = '';
    for (const [pattern, w] of signals) {
      const hit = text.match(pattern);
      if (hit && w > weight) {
        weight = w;
        label = hit[0].toLowerCase().trim();
      }
    }
    return { weight, label };
  };

  for (const pattern of DISQUALIFYING) {
    const hit = fullText.match(pattern);
    if (hit) {
      return {
        score: 0,
        reasoning: `excluded: ${hit[0].toLowerCase().trim()}`,
      };
    }
  }

  const adminHit = description.slice(0, 900).match(ADMIN_ROLE);
  if (adminHit) {
    return {
      score: 0,
      reasoning: `excluded: support role (${adminHit[0].toLowerCase()})`,
    };
  }

  // An explicit field name is sufficient on its own.
  const explicit = best(EXPLICIT_FIELD, fullText);
  if (explicit.weight > 0) {
    const inTitle = EXPLICIT_FIELD.some(([p]) => p.test(titleText));
    const score = Math.min(1, explicit.weight * (inTitle ? 1 : 0.85));
    return {
      score: Number(score.toFixed(3)),
      reasoning: `${explicit.label}${inTitle ? ' (in title)' : ''}`,
    };
  }

  const method = best(METHOD_SIGNALS, fullText);
  const social = best(SOCIAL_SIGNALS, subjectText);

  // The core rule: both halves are required. Either alone is near-worthless as
  // a CSS signal, so the product collapses to roughly zero.
  if (method.weight === 0 || social.weight === 0) {
    const lone = method.weight > 0 ? method : social;
    return {
      score: lone.weight > 0 ? Number((lone.weight * 0.08).toFixed(3)) : 0,
      reasoning: lone.label
        ? `only ${method.weight > 0 ? 'method' : 'subject'} signal: ${lone.label}`
        : 'no signals matched',
    };
  }

  matched.push(`method: ${method.label}`, `subject: ${social.label}`);

  let score = method.weight * social.weight;

  // A social subject named in the title is a much stronger indicator than one
  // buried in a paragraph of boilerplate.
  if (SOCIAL_SIGNALS.some(([p]) => p.test(titleText))) {
    score = Math.min(1, score * 1.25);
    matched.push('subject in title');
  }

  return {
    score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
    reasoning: matched.join(', '),
  };
}

// Dedupe key for the same role syndicated across feeds under different URLs.
// Normalised so trivial punctuation or casing differences still collide.
export async function contentHash(
  title: string,
  institution: string,
): Promise<string> {
  const canonical = `${title}|${institution}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function requireUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Matches the valid_application_url / valid_source_url CHECK constraints.
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export async function normalizeJob(
  raw: RawJob,
  source: string,
  botId: string,
  options: { maxAgeDays?: number; now?: Date } = {},
): Promise<NormalizedJob> {
  const now = options.now ?? new Date();
  const title = clamp(
    decodeEntities(raw.title).trim().replace(/\s+/g, ' '),
    TITLE_MAX,
  );
  const institution = clamp(
    decodeEntities(raw.institution || '').trim().replace(/\s+/g, ' '),
    INSTITUTION_MAX,
  );
  const description = clamp(stripHtml(raw.description), DESCRIPTION_MAX);
  const sourceUrl = requireUrl(raw.sourceUrl);

  // Anything failing here would be rejected by the database anyway; skipping
  // keeps one malformed listing from aborting the whole run.
  if (title.length < TITLE_MIN) {
    throw new SkippedJobError(`title too short: "${raw.title}"`);
  }
  if (institution.length < INSTITUTION_MIN) {
    throw new SkippedJobError(`missing institution for "${title}"`);
  }
  if (description.length < DESCRIPTION_MIN) {
    throw new SkippedJobError(`description too short for "${title}"`);
  }
  if (!sourceUrl) {
    throw new SkippedJobError(`invalid source URL for "${title}"`);
  }

  const postedAt = parsePostedAt(raw.postedAt, now);
  const deadline = extractDeadline(description, now);

  // Freshness. A feed that never expires its entries (CoMSES still lists
  // 2021 postings) would otherwise fill the queue with roles that closed
  // years ago. Two independent signals, either of which retires a listing:
  //   - a stated deadline that has already passed
  //   - a posting date older than the source's window
  // A listing with no date at all is kept: absence of evidence is not
  // evidence of staleness, and the admin can still judge it.
  if (deadline && new Date(deadline).getTime() < now.getTime()) {
    throw new StaleJobError(
      `deadline passed (${deadline}) for "${title}"`,
    );
  }

  const maxAgeDays = options.maxAgeDays;
  if (maxAgeDays && postedAt) {
    const ageDays = (now.getTime() - new Date(postedAt).getTime()) / 86400000;
    if (ageDays > maxAgeDays) {
      throw new StaleJobError(
        `posted ${Math.round(ageDays)} days ago (limit ${maxAgeDays}) for "${title}"`,
      );
    }
  }

  const { score, reasoning } = scoreRelevance(title, description);

  return {
    title,
    institution,
    location: clamp(
      decodeEntities(raw.location || 'Not specified').trim(),
      200,
    ),
    description,
    job_type: mapJobType(raw.jobType, title),
    application_url: requireUrl(raw.applicationUrl) ?? sourceUrl,
    source,
    source_url: sourceUrl,
    source_job_id: raw.sourceJobId ?? null,
    content_hash: await contentHash(title, institution),
    relevance_score: score,
    relevance_reasoning: reasoning,
    is_auto_imported: true,
    posted_by: botId,
    posted_at: postedAt,
    application_deadline: deadline,
  };
}
