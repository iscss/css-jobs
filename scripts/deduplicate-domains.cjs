const fs = require('fs');
const path = require('path');

// Read the university domains JSON
const domainsPath = path.join(__dirname, '../public/data/university-domains.json');
const universities = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));

console.log(`Original: ${universities.length} universities`);

// Track seen domains
const seenDomains = new Set();
const duplicates = [];

// Deduplicate
const deduped = universities.filter((university) => {
  const newDomains = university.domains.filter(domain => {
    const cleanDomain = domain.toLowerCase().trim();
    if (seenDomains.has(cleanDomain)) {
      duplicates.push({ domain: cleanDomain, university: university.name });
      return false;
    }
    seenDomains.add(cleanDomain);
    return true;
  });

  // Only keep universities that have at least one unique domain
  if (newDomains.length === 0) return false;

  university.domains = newDomains;
  return true;
});

console.log(`Deduplicated: ${deduped.length} universities`);
console.log(`Removed ${universities.length - deduped.length} universities with only duplicate domains`);
console.log(`Found ${duplicates.length} duplicate domain entries`);

if (duplicates.length > 0) {
  console.log('\nSample duplicates:');
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`  - ${dup.domain} (from ${dup.university})`);
  });
}

// Write back to file
fs.writeFileSync(domainsPath, JSON.stringify(deduped, null, 2));

console.log(`\n✅ Cleaned file written to ${domainsPath}`);
console.log('Run generate-domains-sql.cjs again to create updated SQL');
