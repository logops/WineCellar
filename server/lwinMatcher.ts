import * as XLSX from 'xlsx';

interface LWINWine {
  lwin: string;
  producer: string;
  wineName: string;
  vintage?: number;
  region: string;
  country: string;
  type: string;
  searchText: string; // Pre-computed for fast searching
}

class LWINMatcher {
  private wines: LWINWine[] = [];
  private isLoaded = false;
  private isLoading = false;

  async initialize(): Promise<void> {
    if (this.isLoaded || this.isLoading) return;
    
    this.isLoading = true;
    console.log('🍷 Loading LWIN database for intelligent matching...');
    
    try {
      const workbook = XLSX.readFile('attached_assets/LWINdatabase.xlsx');
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const headers = data[0] as string[];
      console.log('📊 LWIN headers:', headers.slice(0, 5));
      
      // Process all wines and create searchable index
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        const wine: Partial<LWINWine> = {};
        
        headers.forEach((header, index) => {
          const value = row[index];
          if (!value || !header) return;
          
          const h = header.toLowerCase();
          if (h.includes('lwin')) wine.lwin = String(value);
          else if (h.includes('producer') || h.includes('winery')) wine.producer = String(value);
          else if (h.includes('wine') && h.includes('name')) wine.wineName = String(value);
          else if (h.includes('vintage') || h.includes('year')) {
            const vintage = parseInt(String(value));
            if (vintage > 1800 && vintage <= 2030) wine.vintage = vintage;
          }
          else if (h.includes('region') && !h.includes('sub')) wine.region = String(value);
          else if (h.includes('country')) wine.country = String(value);
          else if (h.includes('type') || h.includes('color')) wine.type = String(value);
        });
        
        // Only add wines with essential data
        if (wine.producer && wine.wineName) {
          const searchText = `${wine.producer} ${wine.wineName} ${wine.region || ''} ${wine.type || ''}`.toLowerCase();
          this.wines.push({
            lwin: wine.lwin || '',
            producer: wine.producer,
            wineName: wine.wineName,
            vintage: wine.vintage,
            region: wine.region || '',
            country: wine.country || '',
            type: wine.type || '',
            searchText
          });
        }
      }
      
      console.log(`✅ LWIN database loaded: ${this.wines.length} wines indexed`);
      console.log(`📋 Sample wines:`, this.wines.slice(0, 3).map(w => `${w.producer} ${w.wineName}`));
      
      this.isLoaded = true;
    } catch (error) {
      console.error('❌ Failed to load LWIN database:', error);
      this.wines = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Find best matches for a wine query with intelligent scoring
   */
  async findMatches(query: string, limit: number = 3): Promise<Array<{
    producer: string;
    wineName: string;
    vintage?: number;
    region: string;
    country: string;
    type: string;
    confidence: number;
    source: string;
  }>> {
    await this.initialize();
    
    if (this.wines.length === 0) {
      console.log('⚠️ LWIN database not available');
      return [];
    }
    
    const searchQuery = query.toLowerCase().trim();
    const searchTerms = searchQuery.split(' ').filter(term => term.length > 1);
    
    console.log(`🔍 Searching ${this.wines.length} wines for: "${query}"`);
    console.log(`📝 Search terms: [${searchTerms.join(', ')}]`);
    
    const matches = [];
    
    for (const wine of this.wines) {
      let score = 0;
      let exactMatches = 0;
      let partialMatches = 0;
      
      // Extract potential vintage from query
      const vintageMatch = searchQuery.match(/\b(19|20)\d{2}\b/);
      const queryVintage = vintageMatch ? parseInt(vintageMatch[0]) : null;
      
      // Producer exact match (highest priority)
      for (const term of searchTerms) {
        if (term.length > 2) {
          const producerLower = wine.producer.toLowerCase();
          if (producerLower === term) {
            score += 0.4; // Exact producer match
            exactMatches++;
          } else if (producerLower.includes(term)) {
            score += 0.25; // Partial producer match
            partialMatches++;
          }
        }
      }
      
      // Wine name matching
      for (const term of searchTerms) {
        if (term.length > 2) {
          const wineNameLower = wine.wineName.toLowerCase();
          if (wineNameLower.includes(term)) {
            score += 0.2;
            partialMatches++;
          }
        }
      }
      
      // Vintage matching
      if (queryVintage && wine.vintage && Math.abs(wine.vintage - queryVintage) <= 1) {
        score += 0.15;
        exactMatches++;
      }
      
      // Region/type matching
      for (const term of searchTerms) {
        if (term.length > 2) {
          if (wine.region.toLowerCase().includes(term) || wine.type.toLowerCase().includes(term)) {
            score += 0.1;
            partialMatches++;
          }
        }
      }
      
      // Boost score for multiple matches
      if (exactMatches >= 2) score *= 1.3;
      if (exactMatches + partialMatches >= 3) score *= 1.2;
      
      // Only include wines with meaningful matches
      if (score >= 0.15) {
        matches.push({
          producer: wine.producer,
          wineName: wine.wineName,
          vintage: queryVintage || wine.vintage,
          region: wine.region,
          country: wine.country,
          type: wine.type,
          confidence: Math.min(score, 1.0),
          source: 'LWIN'
        });
      }
    }
    
    const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);
    console.log(`🎯 Found ${sortedMatches.length} matches, returning top ${limit}`);
    
    if (sortedMatches.length > 0) {
      console.log(`🏆 Best match: ${sortedMatches[0].producer} ${sortedMatches[0].wineName} (${Math.round(sortedMatches[0].confidence * 100)}%)`);
    }
    
    return sortedMatches.slice(0, limit);
  }
}

export const lwinMatcher = new LWINMatcher();