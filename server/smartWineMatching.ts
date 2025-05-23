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

let lwinWorkbook: XLSX.WorkBook | null = null;
let lwinHeaders: string[] = [];

/**
 * Initialize LWIN workbook (loads once, searches many times)
 */
function initializeLWINWorkbook() {
  if (!lwinWorkbook) {
    console.log('Loading LWIN workbook for wine matching...');
    lwinWorkbook = XLSX.readFile('attached_assets/LWINdatabase.xlsx');
    const worksheet = lwinWorkbook.Sheets[lwinWorkbook.SheetNames[0]];
    
    // Get headers
    const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
    lwinHeaders = headerRow || [];
    
    console.log('LWIN workbook initialized for smart matching');
  }
}

/**
 * Smart wine matching - searches LWIN database for matches
 */
export async function findSmartWineMatches(searchQuery: string, limit: number = 3): Promise<WineMatch[]> {
  try {
    initializeLWINWorkbook();
    
    if (!lwinWorkbook) {
      return [];
    }

    const worksheet = lwinWorkbook.Sheets[lwinWorkbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const matches: WineMatch[] = [];
    const searchLower = searchQuery.toLowerCase();
    const searchParts = searchLower.split(' ').filter(part => part.length > 2);
    
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
      
      // Calculate match confidence
      const fullText = `${wine.producer} ${wine.wineName} ${wine.vintage || ''} ${wine.region || ''}`.toLowerCase();
      
      let confidence = 0;
      
      // Exact match gets highest score
      if (fullText.includes(searchLower)) {
        confidence = 0.9;
      }
      // Partial matches
      else {
        let matchCount = 0;
        for (const part of searchParts) {
          if (fullText.includes(part)) {
            matchCount++;
          }
        }
        confidence = matchCount / searchParts.length * 0.7;
      }
      
      // Producer name similarity bonus
      if (wine.producer.toLowerCase().includes(searchParts[0] || '')) {
        confidence += 0.1;
      }
      
      if (confidence > 0.3) {
        matches.push({
          producer: wine.producer,
          wineName: wine.wineName,
          vintage: wine.vintage,
          region: wine.region,
          country: wine.country,
          type: wine.type,
          confidence: Math.min(confidence, 1),
          source: 'LWIN Database'
        });
      }
    }
    
    // Sort by confidence and return top matches
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
      
  } catch (error) {
    console.error('Error in smart wine matching:', error);
    return [];
  }
}

/**
 * API handler for wine matching requests
 */
export async function handleWineMatchingRequest(req: Request, res: Response) {
  try {
    const { query, limit = 3 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }

    const matches = await findSmartWineMatches(query, limit);
    
    res.json({
      success: true,
      query,
      matches,
      hasMatches: matches.length > 0
    });
    
  } catch (error) {
    console.error('Error handling wine matching request:', error);
    res.status(500).json({ error: 'Failed to search wine matches' });
  }
}