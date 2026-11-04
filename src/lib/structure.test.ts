import { describe, it, expect, vi } from 'vitest';
import {
  buildStructurePrompt,
  parseStructure,
  structureJob,
  verifyStructure,
} from '../../supabase/functions/_shared/structure';
import type { MessagesClient } from '../../supabase/functions/_shared/llm';

const today = '2026-11-04';

const posting = `Postdoctoral Research Fellow, Future of Labor

The Institute studies how computation changes work.

Responsibilities
- Build network models of labour markets
- Write papers

Qualifications
PhD in sociology, economics or a related field.

Compensation
The salary range is $72,000 to $78,000 per year, plus benefits.

How to apply
Applications should be submitted by a separate link: https://apply.interfolio.com/186103.
Applications close on March 1, 2027. Work is based in Cambridge, MA.`;

const raw = (over = {}) => ({
  sections: [
    { heading: 'Overview', starts_with: 'The Institute studies how' },
    { heading: 'Responsibilities', starts_with: 'Responsibilities - Build network' },
    { heading: 'Qualifications', starts_with: 'Qualifications PhD in' },
    { heading: 'Compensation and benefits', starts_with: 'Compensation The salary range' },
    { heading: 'How to apply', starts_with: 'How to apply Applications should' },
  ],
  pay_range: 'The salary range is $72,000 to $78,000 per year',
  application_link: 'https://apply.interfolio.com/186103',
  deadline: { date: '2027-03-01', quote: 'Applications close on March 1, 2027' },
  location: 'Work is based in Cambridge, MA',
  ...over,
});

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('verifyStructure', () => {
  it('reads the fields straight from the posting', () => {
    const r = verifyStructure(posting, raw(), today);
    expect(r.application_link).toBe('https://apply.interfolio.com/186103');
    expect(r.pay_range).toBe('The salary range is $72,000 to $78,000 per year');
    expect(r.deadline).toEqual({ date: '2027-03-01', quote: 'Applications close on March 1, 2027' });
    expect(r.location).toBe('Work is based in Cambridge, MA');
    expect(r.dropped).toEqual([]);
  });

  it('labels the sections and keeps the original wording', () => {
    const r = verifyStructure(posting, raw(), today);
    expect(r.sections.map((s) => s.heading)).toEqual([
      'Overview', 'Responsibilities', 'Qualifications', 'Compensation and benefits', 'How to apply',
    ]);
    expect(r.sections[1].text).toContain('- Build network models of labour markets');
  });

  it('loses no text: the sections together are the whole posting', () => {
    const r = verifyStructure(posting, raw(), today);
    // the title line before the overview is kept as its own lead-in
    const joined = r.sections.map((s) => s.text).join(' ');
    expect(squash(joined)).toBe(squash(posting));
  });

  it('keeps the currency sign on a pay range', () => {
    const text = 'Pay Rate Type Salary. Pay Range $50,000.00 - $70,000.00 depending on experience.';
    const r = verifyStructure(text, {
      sections: [], pay_range: '$50,000.00 - $70,000.00', application_link: null, deadline: null, location: null,
    }, today);
    expect(r.pay_range).toBe('$50,000.00 - $70,000.00');
  });

  it('drops a pay figure the posting does not contain', () => {
    const r = verifyStructure(posting, raw({ pay_range: 'Salary of $95,000 per year' }), today);
    expect(r.pay_range).toBeNull();
    expect(r.dropped.join(' ')).toContain('pay_range');
  });

  it('drops an application link the posting does not contain', () => {
    const r = verifyStructure(posting, raw({ application_link: 'https://evil.example/apply' }), today);
    expect(r.application_link).toBeNull();
  });

  it('drops a link that is not http(s)', () => {
    const text = 'Apply at javascript:alert(1) today, or see our page for details.';
    const r = verifyStructure(text, {
      sections: [], pay_range: null, application_link: 'javascript:alert(1)', deadline: null, location: null,
    }, today);
    expect(r.application_link).toBeNull();
  });

  it('trims sentence punctuation off a link', () => {
    const r = verifyStructure(posting, raw({ application_link: 'https://apply.interfolio.com/186103.' }), today);
    expect(r.application_link).toBe('https://apply.interfolio.com/186103');
  });

  it('drops a deadline whose quote is not in the posting or whose date is invalid', () => {
    expect(verifyStructure(posting, raw({ deadline: { date: '2027-03-01', quote: 'Closes on 1 March' } }), today).deadline).toBeNull();
    expect(verifyStructure(posting, raw({ deadline: { date: '2027-02-31', quote: 'Applications close on March 1, 2027' } }), today).deadline).toBeNull();
    expect(verifyStructure(posting, raw({ deadline: { date: '2027-03-01', quote: 'Applications close on' } }), today).deadline).toBeNull();
  });

  it('ignores case and line breaks when matching quotes', () => {
    const r = verifyStructure(posting, raw({ location: 'WORK IS BASED\nIN cambridge, ma' }), today);
    expect(r.location).toBe('Work is based in Cambridge, MA');
  });

  it('skips a section whose start is not in the posting, without losing text', () => {
    const r = verifyStructure(posting, raw({
      sections: [
        { heading: 'Overview', starts_with: 'The Institute studies how' },
        { heading: 'Responsibilities', starts_with: 'This phrase was never written' },
        { heading: 'Qualifications', starts_with: 'Qualifications PhD in' },
      ],
    }), today);
    expect(r.dropped.join(' ')).toContain('Responsibilities');
    expect(squash(r.sections.map((s) => s.text).join(' '))).toBe(squash(posting));
  });

  it('keeps sections in the order they appear', () => {
    const r = verifyStructure(posting, raw({
      sections: [
        { heading: 'Qualifications', starts_with: 'Qualifications PhD in' },
        { heading: 'Responsibilities', starts_with: 'Responsibilities - Build network' },
      ],
    }), today);
    // the second start sits before the first, so it cannot be placed
    expect(r.sections.filter((s) => s.heading === 'Responsibilities')).toHaveLength(0);
  });

  it('files an unknown heading under Other', () => {
    const r = verifyStructure(posting, raw({
      sections: [{ heading: 'Perks and snacks', starts_with: 'The Institute studies how' }],
    }), today);
    expect(r.sections.some((s) => s.heading === 'Other')).toBe(true);
  });

  it('ignores bullets, dashes and line breaks when matching a start', () => {
    const text = 'Intro line about the lab and its work here.\n\nWorking Environmental Conditions\n• Primarily office-based work\n• Some travel';
    const r = verifyStructure(text, {
      sections: [
        { heading: 'Overview', starts_with: 'Intro line about the lab' },
        { heading: 'Other', starts_with: 'Working Environmental Conditions Primarily office-based work' },
      ],
      pay_range: null, application_link: null, deadline: null, location: null,
    }, today);
    expect(r.dropped).toEqual([]);
    expect(r.sections[1].text).toContain('• Primarily office-based work');
  });

  it('does not place a section on the job title, which is not in the posting', () => {
    const r = verifyStructure(posting, raw({
      sections: [
        { heading: 'Overview', starts_with: 'Research Fellow in Imaginary Studies' },
        { heading: 'Responsibilities', starts_with: 'Responsibilities - Build network' },
      ],
    }), today);
    expect(r.dropped.join(' ')).toContain('Overview');
    // the text before the first placed section is kept as the overview
    expect(r.sections[0].heading).toBe('Overview');
    expect(squash(r.sections.map((s) => s.text).join(' '))).toBe(squash(posting));
  });

  it('drops an invented section the posting does not contain', () => {
    const r = verifyStructure(posting, raw({
      sections: [
        { heading: 'Overview', starts_with: 'The Institute studies how' },
        { heading: 'How to apply', starts_with: 'Send your resume and cover letter' },
      ],
    }), today);
    expect(r.dropped.join(' ')).toContain('How to apply');
  });

  it('returns no sections when none can be placed', () => {
    const r = verifyStructure(posting, raw({ sections: [{ heading: 'Overview', starts_with: 'nonsense nonsense' }] }), today);
    expect(r.sections).toEqual([]);
  });
});

describe('parseStructure', () => {
  it('reads a clean reply, also when wrapped in prose', () => {
    const text = 'Here:\n```json\n' + JSON.stringify(raw()) + '\n```';
    expect(parseStructure(text)?.sections).toHaveLength(5);
  });

  it.each(['no json', '{not json}', '', '{"pay_range": null}', '{"sections": "x"}'])('rejects %j', (text) => {
    expect(parseStructure(text)).toBeNull();
  });

  it('treats blank or non-string fields as missing', () => {
    const r = parseStructure(JSON.stringify({ sections: [], pay_range: '  ', application_link: 5, deadline: { date: 'x' }, location: null }));
    expect(r).toEqual({ sections: [], pay_range: null, application_link: null, deadline: null, location: null });
  });
});

describe('buildStructurePrompt / structureJob', () => {
  it('wraps the posting in tags', () => {
    const p = buildStructurePrompt('T', 'I', 'body', today);
    expect(p).toContain('<posting>');
    expect(p.endsWith('</posting>')).toBe(true);
  });

  const clientReturning = (text: string, stop_reason = 'end_turn'): MessagesClient => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        stop_reason,
        content: [{ type: 'text', text }],
        usage: { input_tokens: 2000, output_tokens: 250 },
      }),
    },
  });
  const job = { title: 'Fellow', institution: 'Inst', description: posting };

  it('returns the checked result and usage', async () => {
    const r = await structureJob(clientReturning(JSON.stringify(raw())), job, undefined, today);
    expect(r?.job.application_link).toBe('https://apply.interfolio.com/186103');
    expect(r?.usage?.input_tokens).toBe(2000);
  });

  it('asks for no sampling params and uses low effort', async () => {
    const client = clientReturning(JSON.stringify(raw()));
    await structureJob(client, job, undefined, today);
    const params = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.output_config).toEqual({ effort: 'low' });
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params).not.toHaveProperty('temperature');
  });

  it('returns null on API errors, refusals and unreadable replies', async () => {
    const failing: MessagesClient = { messages: { create: vi.fn().mockRejectedValue(new Error('429')) } };
    expect(await structureJob(failing, job)).toBeNull();
    expect(await structureJob(clientReturning('', 'refusal'), job)).toBeNull();
    expect(await structureJob(clientReturning('cannot say'), job)).toBeNull();
  });
});
