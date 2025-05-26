import XLSX from 'xlsx';
import { Request, Response } from 'express';

interface WineMatch {
  producer: string;
  wineName: string;
  vintage?: number;
  region?: string;
  country?: string;
  type?: string;
  confidence: number;
  source: string;
}

let lwinData: any[] | null = null;
let lwinHeaders: string[] = [];
let isLoading = false;

/**
 * Initialize LWIN database (loads once, caches in memory)
 */
async function initializeLWINDatabase() {
  if (lwinData || isLoading) {
    return; // Already loaded or loading
  }
  
  isLoading = true;
  
  try {
    console.log('Loading LWIN database for wine matching...');
    
    // Add small delay to prevent file system overload
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const workbook = XLSX.readFile('attached_assets/LWINdatabase.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get headers
    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    lwinHeaders = (allData[0] as string[]) || [];
    
    // Cache the data (excluding header row)
    lwinData = allData.slice(1);
    
    console.log('LWIN database loaded successfully');
    console.log('Headers:', lwinHeaders.slice(0, 5));
    console.log('Total wine records:', lwinData.length);
    
    // Quick verification
    if (lwinData.length > 0) {
      console.log('Sample record:', lwinData[0]);
    }
    
  } catch (error) {
    console.error('Error loading LWIN database:', error);
    lwinData = []; // Set to empty array on error
  } finally {
    isLoading = false;
  }
}

/**
 * Parse user input to extract structured wine information
 */
function parseWineInput(searchQuery: string) {
  const parts = searchQuery.toLowerCase().trim().split(/\s+/);
  let vintage: number | undefined;
  let producer = '';
  let wineName = '';
  let grapeVarieties = '';
  
  // Extract vintage (year patterns like 18, 19, 20, or full years)
  for (const part of parts) {
    if (/^\d{2}$/.test(part)) {
      const year = parseInt(part);
      if (year >= 0 && year <= 30) vintage = 2000 + year;
      else if (year >= 80 && year <= 99) vintage = 1900 + year;
    } else if (/^\d{4}$/.test(part)) {
      const year = parseInt(part);
      if (year >= 1900 && year <= 2030) vintage = year;
    }
  }
  
  // Extract common producer abbreviations and full names
  const producerAbbrevs = {
    'rmw': 'robert mondavi',
    'ah': 'august hunicke',
    'gc': 'grgich hills',
    'ws': 'williams selyem',
    'bbv': 'buena vista',
    'dico': 'dicola'
  };
  
  // Look for producer matches
  for (const [abbrev, fullName] of Object.entries(producerAbbrevs)) {
    if (parts.includes(abbrev)) {
      producer = fullName;
      break;
    }
  }
  
  // If no abbreviation match, try longer producer names
  if (!producer) {
    const producerWords = ['ridge', 'beringer', 'keenan', 'silver'];
    for (const word of producerWords) {
      if (parts.includes(word)) {
        producer = word;
        break;
      }
    }
  }
  
  // Extract grape varieties
  const grapeTypes = ['cab', 'cabernet', 'merlot', 'malbec', 'carignane', 'blend'];
  for (const grape of grapeTypes) {
    if (parts.includes(grape)) {
      if (grape === 'cab') grapeVarieties = 'cabernet sauvignon';
      else grapeVarieties = grape;
      break;
    }
  }
  
  // Remaining words could be wine name
  const remainingParts = parts.filter(p => 
    !Object.keys(producerAbbrevs).includes(p) &&
    !['ridge', 'beringer', 'keenan', 'silver'].includes(p) &&
    !grapeTypes.includes(p) &&
    !/^\d+x?$/.test(p) && // Remove quantity indicators
    p !== vintage?.toString()
  );
  
  wineName = remainingParts.join(' ');
  
  return { vintage, producer, wineName, grapeVarieties };
}

/**
 * Smart wine matching - searches LWIN database for matches
 * Prioritizes: 1) Producer matches, 2) Wine name matches, 3) Grape variety matches
 */
export async function findSmartWineMatches(searchQuery: string, limit: number = 3): Promise<WineMatch[]> {
  try {
    initializeLWINWorkbook();
    
    if (!lwinWorkbook) {
      return [];
    }

    const worksheet = lwinWorkbook.Sheets[lwinWorkbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Parse the user input into structured components
    const parsedInput = parseWineInput(searchQuery);
    console.log('🔍 Parsed wine input:', parsedInput);
    
    const matches: WineMatch[] = [];
    
    // Search through rows (skip header)
    for (let i = 1; i < Math.min(data.length, 10000); i++) { // Limit search for performance
      const row = data[i] as any[];
      const wine: any = {};
      
      // Map row data
      lwinHeaders.forEach((header, index) => {
        const value = row[index];
        if (value && header) {
          const h = header.toLowerCase();
          if (h.includes('producer') || h.includes('winery')) wine.producer = String(value);
          else if (h.includes('wine') && h.includes('name')) wine.wineName = String(value);
          else if (h.includes('vintage') || h.includes('year')) {
            const vintage = parseInt(String(value));
            if (vintage > 1800 && vintage <= 2030) wine.vintage = vintage;
          }
          else if (h.includes('region') && !h.includes('sub')) wine.region = String(value);
          else if (h.includes('country')) wine.country = String(value);
          else if (h.includes('type')) wine.type = String(value);
        }
      });
      
      if (!wine.producer || !wine.wineName) continue;
      
      // Smart confidence calculation based on structured matching
      let confidence = 0;
      const producerLower = wine.producer.toLowerCase();
      const wineNameLower = wine.wineName.toLowerCase();
      
      // 1. Producer matching (highest priority)
      if (parsedInput.producer && producerLower.includes(parsedInput.producer)) {
        confidence += 0.5; // Strong match for producer
        
        // 2. Vintage matching (if we have both)
        if (parsedInput.vintage && wine.vintage === parsedInput.vintage) {
          confidence += 0.3; // Vintage match is very important
        }
        
        // 3. Wine name or grape variety matching
        if (parsedInput.wineName && wineNameLower.includes(parsedInput.wineName)) {
          confidence += 0.2; // Wine name match
        } else if (parsedInput.grapeVarieties) {
          const grapeVarieties = parsedInput.grapeVarieties.toLowerCase();
          if (wineNameLower.includes(grapeVarieties) || 
              (wine.type && wine.type.toLowerCase().includes(grapeVarieties))) {
            confidence += 0.15; // Grape variety fallback match
          }
        }
      } else {
        // Fallback: partial producer matches
        if (parsedInput.producer) {
          const producerWords = parsedInput.producer.split(' ');
          for (const word of producerWords) {
            if (word.length > 2 && producerLower.includes(word)) {
              confidence += 0.2;
              break;
            }
          }
        }
        
        // Fallback: grape variety matching without producer
        if (parsedInput.grapeVarieties && 
            (wineNameLower.includes(parsedInput.grapeVarieties.toLowerCase()) ||
             (wine.type && wine.type.toLowerCase().includes(parsedInput.grapeVarieties.toLowerCase())))) {
          confidence += 0.1;
        }
      }
      
      // Only include wines with meaningful confidence scores
      if (confidence >= 0.1) {
        matches.push({
          producer: wine.producer,
          wineName: wine.wineName,
          vintage: parsedInput.vintage || wine.vintage, // Preserve user's vintage
          region: wine.region,
          country: wine.country,
          type: wine.type,
          confidence: Math.min(confidence, 1.0),
          source: 'LWIN'
        });
      }
    }
    
    // If no matches found, return the user's original input so they can edit it
    if (matches.length === 0) {
      console.log('No LWIN matches found for:', searchQuery, '- returning user input for editing');
      const parsed = parseWineInput(searchQuery);
      return [{
        producer: parsed.producer || '',
        wineName: parsed.wineName || '',
        vintage: parsed.vintage,
        region: '',
        country: '',
        type: '',
        confidence: 0,
        source: 'user_input'
      }];
    }
    
    // Sort by confidence and return top matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
      
  } catch (error) {
    console.error('Error in smart wine matching:', error);
    // Even on error, return parsed user input
    const parsed = parseWineInput(searchQuery);
    return [{
      producer: parsed.producer || '',
      wineName: parsed.wineName || '',
      vintage: parsed.vintage,
      region: '',
      country: '',
      type: '',
      confidence: 0,
      source: 'user_input'
    }];
  }
}

/**
 * API endpoint for smart wine matching
 */
export async function handleSmartWineMatching(req: Request, res: Response) {
  try {
    const { query, limit = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const matches = await findSmartWineMatches(query, limit);
    
    res.json({
      query,
      matches,
      count: matches.length
    });
    
  } catch (error) {
    console.error('Error in wine matching API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}