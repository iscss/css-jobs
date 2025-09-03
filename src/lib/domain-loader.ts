import { supabase } from '@/integrations/supabase/client';
import universityDomainsData from '../../data/university-domains.json';

interface UniversityData {
  name: string;
  domains: string[];
  country: string;
  alpha_two_code: string;
  'state-province': string | null;
}

export class DomainLoader {
  private static domainSet: Set<string> | null = null;
  private static domainMap: Map<string, UniversityData> | null = null;

  /**
   * Initialize the domain lookup structures from the JSON data
   */
  static initialize() {
    if (this.domainSet && this.domainMap) {
      return; // Already initialized
    }

    this.domainSet = new Set();
    this.domainMap = new Map();

    for (const university of universityDomainsData as UniversityData[]) {
      for (const domain of university.domains) {
        const cleanDomain = domain.toLowerCase().trim();
        this.domainSet.add(cleanDomain);
        this.domainMap.set(cleanDomain, university);
      }
    }

    console.log(`Loaded ${this.domainSet.size} university domains`);
  }

  /**
   * Check if an email domain is from an approved university
   */
  static isApprovedDomain(email: string): boolean {
    this.initialize();
    
    const domain = this.extractDomain(email);
    return this.domainSet!.has(domain);
  }

  /**
   * Get university information for a given email domain
   */
  static getUniversityInfo(email: string): UniversityData | null {
    this.initialize();
    
    const domain = this.extractDomain(email);
    return this.domainMap!.get(domain) || null;
  }

  /**
   * Extract domain from email address
   */
  private static extractDomain(email: string): string {
    return email.toLowerCase().split('@')[1] || '';
  }

  /**
   * Load all university domains into the database
   * This should be run once during setup or when updating domains
   */
  static async populateDatabase(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log('Starting to populate university domains in database...');
      
      // Clear existing domains
      const { error: deleteError } = await supabase
        .from('approved_domains')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        throw deleteError;
      }

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
        
        const { error: insertError } = await supabase
          .from('approved_domains')
          .insert(batch);

        if (insertError) {
          throw insertError;
        }
        
        insertedCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(domainData.length / batchSize)}`);
      }

      // Update last sync timestamp
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          key: 'domain_last_synced',
          value: new Date().toISOString()
        });

      if (settingsError) {
        throw settingsError;
      }

      console.log(`Successfully loaded ${insertedCount} university domains into database`);
      
      return { success: true, count: insertedCount };
    } catch (error: any) {
      console.error('Error populating domains:', error);
      return { success: false, count: 0, error: error.message };
    }
  }

  /**
   * Get all domains for testing/debugging
   */
  static getAllDomains(): string[] {
    this.initialize();
    return Array.from(this.domainSet!);
  }
}

// Initialize on import
DomainLoader.initialize();