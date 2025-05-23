import XLSX from 'xlsx';
import { db } from './db';
import { sql } from 'drizzle-orm';

interface WineMatch {
  producer: string;
  wineName: string;
  vintage?: number;
  region?: string;
  country?: string;
  type?: string;
  lwin?: string;
  confidence: number;
}

/**
 * Search for wine matches in the LWIN database with fuzzy matching
 */
export async function searchWineMatches(query: string, limit: number = 5): Promise<WineMatch[]> {
  try {
    // For now, let's implement a simple matching system
    // We'll enhance this once we understand your LWIN database structure better
    
    const cleanQuery = query.trim().toLowerCase();
    const queryParts = cleanQuery.split(' ').filter(part => part.length > 2);
    
    // Create a basic matching system using existing producer data
    const matches: WineMatch[] = [];
    
    // This is a placeholder implementation
    // Once we load your LWIN database, this will search against the real data
    console.log(`Searching for wine matches: ${query}`);
    
    return matches;
  } catch (error) {
    console.error('Error searching wine matches:', error);
    return [];
  }
}

/**
 * Load LWIN database in smaller chunks for better performance
 */
export async function loadLWINDatabaseChunked(): Promise<void> {
  try {
    console.log('Starting chunked LWIN database load...');
    
    // Read just the headers first to understand structure
    const workbook = XLSX.readFile('attached_assets/LWINdatabase.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get sheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`LWIN database has ${range.e.r + 1} rows and ${range.e.c + 1} columns`);
    
    // Read headers
    const headers: string[] = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? String(cell.v) : `Column${col}`);
    }
    
    console.log('LWIN Headers:', headers.slice(0, 10)); // Show first 10 headers
    
    // Create the wine reference table
    await createWineReferenceTable();
    
    // Process data in chunks of 1000 rows
    const chunkSize = 1000;
    const totalRows = range.e.r;
    
    for (let startRow = 1; startRow <= totalRows; startRow += chunkSize) {
      const endRow = Math.min(startRow + chunkSize - 1, totalRows);
      console.log(`Processing rows ${startRow} to ${endRow} of ${totalRows}`);
      
      // Process this chunk
      await processLWINChunk(worksheet, headers, startRow, endRow, range.e.c);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('LWIN database loaded successfully!');
    
  } catch (error) {
    console.error('Error loading LWIN database:', error);
    throw error;
  }
}

/**
 * Create wine reference table
 */
async function createWineReferenceTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wine_reference (
      id SERIAL PRIMARY KEY,
      lwin VARCHAR(255),
      producer VARCHAR(500) NOT NULL,
      wine_name VARCHAR(500),
      vintage INTEGER,
      region VARCHAR(255),
      country VARCHAR(255),
      wine_type VARCHAR(100),
      color VARCHAR(50),
      appellation VARCHAR(255),
      classification VARCHAR(255),
      search_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for fast searching
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wine_ref_producer ON wine_reference(producer)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wine_ref_wine_name ON wine_reference(wine_name)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wine_ref_vintage ON wine_reference(vintage)`);
  
  // Create text search index
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wine_ref_search_trgm ON wine_reference USING gin (search_text gin_trgm_ops)`);
}

/**
 * Process a chunk of LWIN data
 */
async function processLWINChunk(
  worksheet: XLSX.WorkSheet, 
  headers: string[], 
  startRow: number, 
  endRow: number, 
  maxCol: number
): Promise<void> {
  const wines: any[] = [];
  
  for (let row = startRow; row <= endRow; row++) {
    const wineData: any = {};
    
    // Read all cells in this row
    for (let col = 0; col <= maxCol; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      const header = headers[col]?.toLowerCase() || '';
      const value = cell ? cell.v : null;
      
      if (value && header) {
        // Map common wine fields
        if (header.includes('lwin')) wineData.lwin = String(value);
        else if (header.includes('producer') || header.includes('winery')) wineData.producer = String(value);
        else if (header.includes('wine') && header.includes('name')) wineData.wine_name = String(value);
        else if (header.includes('vintage') || header.includes('year')) {
          const vintage = parseInt(String(value));
          if (vintage > 1800 && vintage <= 2030) wineData.vintage = vintage;
        }
        else if (header.includes('region') && !header.includes('sub')) wineData.region = String(value);
        else if (header.includes('country')) wineData.country = String(value);
        else if (header.includes('type')) wineData.wine_type = String(value);
        else if (header.includes('color') || header.includes('colour')) wineData.color = String(value);
        else if (header.includes('appellation')) wineData.appellation = String(value);
        else if (header.includes('classification')) wineData.classification = String(value);
      }
    }
    
    // Only include wines with essential data
    if (wineData.producer && (wineData.wine_name || wineData.lwin)) {
      // Create search text for fuzzy matching
      const searchParts = [
        wineData.producer,
        wineData.wine_name,
        wineData.vintage,
        wineData.region,
        wineData.country
      ].filter(Boolean);
      
      wineData.search_text = searchParts.join(' ').toLowerCase();
      wines.push(wineData);
    }
  }
  
  // Insert this batch
  if (wines.length > 0) {
    await insertWinesBatch(wines);
  }
}

/**
 * Insert wines batch into database
 */
async function insertWinesBatch(wines: any[]): Promise<void> {
  if (wines.length === 0) return;
  
  const values = wines.map(wine => {
    const escape = (str: string | null | undefined) => 
      str ? `'${String(str).replace(/'/g, "''")}'` : 'NULL';
    
    return `(
      ${escape(wine.lwin)},
      ${escape(wine.producer)},
      ${escape(wine.wine_name)},
      ${wine.vintage || 'NULL'},
      ${escape(wine.region)},
      ${escape(wine.country)},
      ${escape(wine.wine_type)},
      ${escape(wine.color)},
      ${escape(wine.appellation)},
      ${escape(wine.classification)},
      ${escape(wine.search_text)}
    )`;
  }).join(',');

  await db.execute(sql.raw(`
    INSERT INTO wine_reference (
      lwin, producer, wine_name, vintage, region, country, 
      wine_type, color, appellation, classification, search_text
    ) VALUES ${values}
  `));
}

/**
 * Search wines using fuzzy matching
 */
export async function findWineMatches(searchQuery: string, limit: number = 5): Promise<WineMatch[]> {
  try {
    const cleanQuery = searchQuery.trim().replace(/'/g, "''").toLowerCase();
    
    const results = await db.execute(sql.raw(`
      SELECT 
        lwin,
        producer,
        wine_name,
        vintage,
        region,
        country,
        wine_type,
        similarity(search_text, '${cleanQuery}') as confidence
      FROM wine_reference
      WHERE 
        search_text ILIKE '%${cleanQuery}%'
        OR similarity(search_text, '${cleanQuery}') > 0.3
      ORDER BY confidence DESC, producer, wine_name
      LIMIT ${limit}
    `));
    
    return (results.rows || []).map((row: any) => ({
      producer: row.producer,
      wineName: row.wine_name,
      vintage: row.vintage,
      region: row.region,
      country: row.country,
      type: row.wine_type,
      lwin: row.lwin,
      confidence: parseFloat(row.confidence) || 0
    }));
    
  } catch (error) {
    console.error('Error finding wine matches:', error);
    return [];
  }
}