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
   * Find best matches for a wine query using intelligent expansion
   * Example: "Di Costanzo Caldwell 18" -> "2018 di Costanzo Wines Caldwell Vineyard"
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
    
    // Extract vintage from user input (preserve user's vintage)
    const vintageMatch = searchQuery.match(/\b(19|20)\d{2}\b/);
    const userVintage = vintageMatch ? parseInt(vintageMatch[0]) : null;
    
    // Common wine abbreviations and variations
    const commonAbbreviations = {
      'cab': ['cabernet', 'cabernet sauvignon'],
      'sauv': ['sauvignon'],
      'chard': ['chardonnay'],
      'pinot': ['pinot noir', 'pinot grigio', 'pinot gris'],
      'merlot': ['merlot'],
      'syrah': ['syrah', 'shiraz'],
      'rmw': ['robert mondavi'],
      'rmv': ['robert mondavi'],
      'op': ['opus one'],
      'screaming': ['screaming eagle'],
      'harlan': ['harlan estate'],
      'bond': ['bond estates'],
      'stag': ["stag's leap"],
      'cakebread': ['cakebread cellars'],
      'caymus': ['caymus vineyards'],
      'silver': ['silver oak'],
      'jordan': ['jordan vineyard'],
      'duckhorn': ['duckhorn vineyards']
    };
    
    // Expand abbreviations in search terms
    const expandedTerms = [];
    for (const term of searchTerms) {
      expandedTerms.push(term);
      if (commonAbbreviations[term]) {
        expandedTerms.push(...commonAbbreviations[term]);
      }
    }
    
    const matches = [];
    
    for (const wine of this.wines) {
      let score = 0;
      let producerMatches = 0;
      let wineNameMatches = 0;
      let exactMatches = 0;
      
      const producerLower = wine.producer.toLowerCase();
      const wineNameLower = wine.wineName.toLowerCase();
      const fullWineText = `${producerLower} ${wineNameLower}`.toLowerCase();
      
      // Multi-level matching strategy
      for (const term of expandedTerms) {
        if (term.length < 2) continue;
        
        // Exact producer name match (highest score)
        if (producerLower === term || producerLower.includes(term)) {
          score += 0.4;
          producerMatches++;
          if (producerLower === term) exactMatches++;
        }
        
        // Producer word match (partial)
        const producerWords = producerLower.split(' ');
        for (const word of producerWords) {
          if (word === term || (word.length > 3 && word.includes(term)) || (term.length > 3 && term.includes(word))) {
            score += 0.25;
            producerMatches++;
          }
        }
        
        // Wine name matching
        if (wineNameLower.includes(term)) {
          score += 0.2;
          wineNameMatches++;
          if (wineNameLower === term) exactMatches++;
        }
        
        // Vineyard/estate matching
        const vineyardWords = ['vineyard', 'estate', 'winery', 'cellars', 'valley'];
        if (vineyardWords.some(vw => term.includes(vw) && wineNameLower.includes(term))) {
          score += 0.15;
          wineNameMatches++;
        }
      }
      
      // Boost scores for multiple matches
      if (producerMatches >= 1 && wineNameMatches >= 1) {
        score += 0.2; // Bonus for matching both producer and wine
      }
      
      if (exactMatches >= 1) {
        score += 0.15; // Bonus for exact matches
      }
      
      // Flexible threshold - include any wine with reasonable matches
      if (score >= 0.3 || (producerMatches >= 1 && score >= 0.2)) {
        matches.push({
          producer: wine.producer,
          wineName: wine.wineName,
          vintage: userVintage || wine.vintage,
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
      const best = sortedMatches[0];
      console.log(`🏆 Best match: ${best.vintage || ''} ${best.producer} ${best.wineName} (${Math.round(best.confidence * 100)}%)`);
    }
    
    return sortedMatches.slice(0, limit);
  }
}

export const lwinMatcher = new LWINMatcher();