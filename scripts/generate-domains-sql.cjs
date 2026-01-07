const fs = require('fs');
const path = require('path');

// Read the university domains JSON
const domainsPath = path.join(__dirname, '../public/data/university-domains.json');
const universities = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));

// Generate SQL INSERT statements
let sql = '-- Load university domains for email verification\n';
sql += '-- This allows users with these email domains to post jobs\n\n';
sql += 'BEGIN;\n\n';

// Clear existing domains
sql += '-- Clear existing domains\n';
sql += 'DELETE FROM public.approved_domains;\n\n';

// Prepare batch inserts
const values = [];

for (const university of universities) {
  for (const domain of university.domains) {
    const cleanDomain = domain.toLowerCase().trim();
    if (cleanDomain && cleanDomain.includes('.')) {
      const institutionName = university.name.replace(/'/g, "''"); // Escape single quotes
      const country = university.country.replace(/'/g, "''");

      values.push(
        `('${cleanDomain}', '${institutionName}', '${country}')`
      );
    }
  }
}

// Insert in batches to avoid query size limits
sql += `-- Inserting ${values.length} university domains\n`;
sql += 'INSERT INTO public.approved_domains (domain, institution_name, country) VALUES\n';

const batchSize = 1000;
for (let i = 0; i < values.length; i += batchSize) {
  const batch = values.slice(i, i + batchSize);

  if (i > 0) {
    sql += '\nON CONFLICT (domain) DO NOTHING;\n\nINSERT INTO public.approved_domains (domain, institution_name, country) VALUES\n';
  }

  sql += batch.join(',\n');
}

sql += '\nON CONFLICT (domain) DO NOTHING;\n\n';
sql += 'COMMIT;\n';

// Write to file
const outputPath = path.join(__dirname, '../supabase/seed-domains.sql');
fs.writeFileSync(outputPath, sql);

console.log(`✅ Generated SQL file with ${values.length} domains: ${outputPath}`);
console.log('\nTo load into Supabase:');
console.log('1. Open Supabase Dashboard → SQL Editor');
console.log('2. Paste contents of supabase/seed-domains.sql');
console.log('3. Click "Run"');
