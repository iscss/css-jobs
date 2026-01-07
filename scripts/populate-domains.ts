import { createClient } from '@supabase/supabase-js';
import universityDomainsData from '../public/data/university-domains.json';

interface UniversityData {
  name: string;
  domains: string[];
  country: string;
  alpha_two_code: string;
  'state-province': string | null;
}

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateDomains() {
  try {
    console.log('Starting to populate university domains in database...');

    // Clear existing domains
    console.log('Clearing existing domains...');
    const { error: deleteError } = await supabase
      .from('approved_domains')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      throw deleteError;
    }
    console.log('✓ Existing domains cleared');

    // Prepare domain data
    const domainData = [];
    for (const university of universityDomainsData as UniversityData[]) {
      for (const domain of university.domains) {
        const cleanDomain = domain.toLowerCase().trim();
        if (cleanDomain && cleanDomain.includes('.')) {
          domainData.push({
            domain: cleanDomain,
            institution_name: university.name,
            country: university.country
          });
        }
      }
    }

    console.log(`Prepared ${domainData.length} domain records`);

    // Insert in batches to avoid timeout
    const batchSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < domainData.length; i += batchSize) {
      const batch = domainData.slice(i, i + batchSize);

      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(domainData.length / batchSize)}...`);

      const { error: insertError } = await supabase
        .from('approved_domains')
        .insert(batch);

      if (insertError) {
        throw insertError;
      }

      insertedCount += batch.length;
      console.log(`✓ Inserted ${insertedCount}/${domainData.length} domains`);
    }

    // Update last sync timestamp
    const { error: settingsError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'domain_last_synced',
        value: new Date().toISOString()
      });

    if (settingsError) {
      console.warn('Warning: Could not update system settings:', settingsError);
    }

    console.log(`\n✅ Successfully loaded ${insertedCount} university domains into database`);

  } catch (error: unknown) {
    console.error('❌ Error populating domains:', error);
    process.exit(1);
  }
}

populateDomains();
