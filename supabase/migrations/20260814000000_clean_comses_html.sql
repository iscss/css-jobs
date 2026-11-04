-- CoMSES descriptions imported before stripHtml handled doubly escaped HTML hold
-- raw tags and entities ("<p>...master&rsquo;s...") that the job page showed as
-- text. The importer is fixed for new jobs; this cleans the ones already stored.
--
-- Only CoMSES rows that still contain a tag are touched, so it is safe to run
-- twice. Changing a description also clears any organised copy (trigger), which
-- the organiser then redoes.

UPDATE public.jobs
SET description = btrim(
  regexp_replace(
    regexp_replace(
      replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(description, '<li[^>]*>', E'\n• ', 'gi'),
              '</(p|div|h[1-6]|ul|ol|tr)>', E'\n\n', 'gi'),
            '<br\s*/?>', E'\n', 'gi'),
          '<[^>]+>', ' ', 'g'),
        '&nbsp;', ' '), '&rsquo;', '’'), '&lsquo;', '‘'), '&ldquo;', '“'), '&rdquo;', '”'),
        '&ndash;', '–'), '&mdash;', '—'), '&hellip;', '…'), '&quot;', '"'), '&#39;', ''''),
      '[ \t]+', ' ', 'g'),
    E'\n{3,}', E'\n\n', 'g')
)
WHERE source = 'comses'
  AND description ~* '<[a-z/][^>]*>';

-- &amp; last, so "&amp;rsquo;" is not turned into a real apostrophe by accident.
UPDATE public.jobs
SET description = replace(description, '&amp;', '&')
WHERE source = 'comses' AND description LIKE '%&amp;%';
