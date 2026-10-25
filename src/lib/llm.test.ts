import { describe, it, expect, vi } from 'vitest';
import {
  buildPrompt,
  deadlineExcerpts,
  validDeadline,
  mapWithConcurrency,
  parseScore,
  scoreWithLlm,
  type MessagesClient,
} from '../../supabase/functions/_shared/llm';

const job = {
  title: 'Postdoc in Computational Sociology',
  institution: 'University of Oxford',
  description: 'We study social networks using text analysis. '.repeat(10),
};

const clientReturning = (text: string, stop_reason = 'end_turn'): MessagesClient => ({
  messages: {
    create: vi.fn().mockResolvedValue({
      stop_reason,
      content: [{ type: 'text', text }],
      usage: { input_tokens: 400, output_tokens: 40 },
    }),
  },
});

describe('parseScore', () => {
  it('reads a clean JSON reply', () => {
    expect(parseScore('{"score": 0.82, "reasoning": "Strong CSS fit."}')).toEqual({
      score: 0.82,
      reasoning: 'Strong CSS fit.',
      deadline: null,
    });
  });

  it('extracts JSON wrapped in prose or code fences', () => {
    const r = parseScore('Here you go:\n```json\n{"score": 0.5, "reasoning": "ok"}\n```');
    expect(r?.score).toBe(0.5);
  });

  it('clamps out-of-range scores into 0-1', () => {
    expect(parseScore('{"score": 7, "reasoning": "x"}')?.score).toBe(1);
    expect(parseScore('{"score": -2, "reasoning": "x"}')?.score).toBe(0);
  });

  it.each([
    'no json here',
    '{"score": "high", "reasoning": "x"}',
    '{"score": 0.5}',
    '{not json}',
    '',
  ])('rejects malformed reply %#', (text) => {
    expect(parseScore(text)).toBeNull();
  });

  it('truncates long reasoning', () => {
    const r = parseScore(`{"score": 0.4, "reasoning": "${'a'.repeat(500)}"}`);
    expect(r?.reasoning.length).toBe(200);
  });
});

describe('deadline', () => {
  const today = '2026-10-26';

  it('keeps a valid future date', () => {
    const r = parseScore('{"score": 0.5, "reasoning": "x", "deadline": "2026-11-15"}', today);
    expect(r?.deadline).toBe('2026-11-15');
  });

  it.each([
    null, 'null', 'rolling', '2026-13-01', '2026-02-31', '15 November 2026',
    '2031-01-01', 20261115,
  ])('rejects doubtful deadline %#', (value) => {
    expect(validDeadline(value, today)).toBeNull();
  });

  it('accepts a date already in the past so ingestion can drop the job', () => {
    expect(validDeadline('2026-09-01', today)).toBe('2026-09-01');
  });

  it('gives the model the posting date to resolve a missing year', () => {
    const p = buildPrompt('T', 'I', 'd', '2026-10-26', '2026-03-02');
    expect(p).toContain('Posting date: 2026-03-02');
    expect(buildPrompt('T', 'I', 'd', '2026-10-26')).not.toContain('Posting date');
  });

  it('tells the model today\'s date', () => {
    expect(buildPrompt('T', 'I', 'd', '2026-10-26')).toContain("Today's date: 2026-10-26");
  });
});

describe('deadline excerpts', () => {
  const filler = 'research '.repeat(400); // ~3,600 characters

  it('pulls deadline wording from beyond the sent part', () => {
    const text = filler + 'Applications close. The closing date is 15 November 2026. ' + filler;
    const prompt = buildPrompt('T', 'I', text, '2026-10-26');
    expect(prompt).toContain('Later in the posting');
    expect(prompt).toContain('15 November 2026');
    expect(prompt.length).toBeLessThan(2600);
  });

  it('adds nothing when no deadline wording is found', () => {
    expect(buildPrompt('T', 'I', filler)).not.toContain('Later in the posting');
  });

  it('merges nearby cues and caps the number of excerpts', () => {
    const cue = ' deadline 1 Dec 2026. ';
    const text = 'x'.repeat(1600) + cue + cue + ' '.repeat(600) + cue + ' '.repeat(600) + cue + ' '.repeat(600) + cue;
    expect(deadlineExcerpts(text, 1500).length).toBeLessThanOrEqual(3);
  });
});

describe('buildPrompt', () => {
  it('wraps the posting in tags and trims long descriptions', () => {
    const p = buildPrompt('T', 'I', 'x'.repeat(5000));
    expect(p).toContain('<posting>');
    expect(p.endsWith('</posting>')).toBe(true);
    expect(p.length).toBeLessThan(1700);
  });
});

describe('scoreWithLlm', () => {
  it('returns the score and usage on success', async () => {
    const client = clientReturning('{"score": 0.9, "reasoning": "Core CSS."}');
    const r = await scoreWithLlm(client, job);
    expect(r?.score).toBe(0.9);
    expect(r?.usage?.input_tokens).toBe(400);
  });

  it('sends the default Haiku model, low effort and no sampling params', async () => {
    const client = clientReturning('{"score": 0.1, "reasoning": "x"}');
    await scoreWithLlm(client, job);
    const params = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.output_config).toEqual({ effort: 'low' });
    expect(params).not.toHaveProperty('temperature');
  });

  it('returns null when the API throws', async () => {
    const client: MessagesClient = {
      messages: { create: vi.fn().mockRejectedValue(new Error('429')) },
    };
    expect(await scoreWithLlm(client, job)).toBeNull();
  });

  it('returns null on refusal or unparseable output', async () => {
    expect(await scoreWithLlm(clientReturning('', 'refusal'), job)).toBeNull();
    expect(await scoreWithLlm(clientReturning('I cannot say'), job)).toBeNull();
  });
});

describe('mapWithConcurrency', () => {
  it('preserves order and never exceeds the limit', async () => {
    let active = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
