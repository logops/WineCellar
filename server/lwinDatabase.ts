import * as XLSX from 'xlsx';
import { db } from './db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface LWINWine {
  lwin?: string;
  producer?: string;
  wineName?: string;
  vintage?: number;
  region?: string;
  subRegion?: string;
  country?: string;
  colour?: string;
  type?: string;
  classification?: string;
  vineyard?: string;
  appellation?: string;
}

/**
 * Load and process the LWIN database from Excel file
 */
export async function loadLWINDatabase(): Promise<void> {
  try {
    console.log('Loading LWIN database...');
    
    // Read the Excel file
    const filePath = path.join(process.cwd(), 'attached_assets', 'LWINdatabase.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.error('LWIN database file not found at:', filePath);
      return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length === 0) {
      console.error('No data found in LWIN database');
      return;
    }

    // Get headers from first row
    const headers = rawData[0] as string[];
    console.log('LWIN Database headers:', headers);
    
    // Process data rows
    const wines: LWINWine[] = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      const wine: LWINWine = {};
      
      headers.forEach((header, index) => {
        const value = row[index];
        if (value !== undefined && value !== null && value !== '') {
          // Map headers to our fields
          const lowerHeader = header.toLowerCase().trim();
          
          if (lowerHeader.includes('lwin')) {
            wine.lwin = String(value);
          } else if (lowerHeader.includes('producer') || lowerHeader.includes('winery')) {
            wine.producer = String(value);
          } else if (lowerHeader.includes('wine') && (lowerHeader.includes('name') || lowerHeader.includes('title'))) {
            wine.wineName = String(value);
          } else if (lowerHeader.includes('vintage') || lowerHeader.includes('year')) {
            const vintage = parseInt(String(value));
            if (!isNaN(vintage) && vintage > 1800 && vintage <= new Date().getFullYear()) {
              wine.vintage = vintage;
            }
          } else if (lowerHeader.includes('region') && !lowerHeader.includes('sub')) {
            wine.region = String(value);
          } else if (lowerHeader.includes('sub') && lowerHeader.includes('region')) {
            wine.subRegion = String(value);
          } else if (lowerHeader.includes('country')) {
            wine.country = String(value);
          } else if (lowerHeader.includes('colour') || lowerHeader.includes('color')) {
            wine.colour = String(value);
          } else if (lowerHeader.includes('type') && !lowerHeader.includes('sub')) {
            wine.type = String(value);
          } else if (lowerHeader.includes('classification')) {
            wine.classification = String(value);
          } else if (lowerHeader.includes('vineyard')) {
            wine.vineyard = String(value);
          } else if (lowerHeader.includes('appellation')) {
            wine.appellation = String(value);
          }
        }
      });
      
      // Only add wines with essential data
      if (wine.producer && (wine.wineName || wine.lwin)) {
        wines.push(wine);
      }
    }

    console.log(`Processed ${wines.length} wines from LWIN database`);
    
    // Create the LWIN table if it doesn't exist
    await createLWINTable();
    
    // Insert wines into database in batches
    await insertLWINWines(wines);
    
    console.log('LWIN database loaded successfully!');
    
  } catch (error) {
    console.error('Error loading LWIN database:', error);
    throw error;
  }
}

/**
 * Create the LWIN wines table
 */
async function createLWINTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lwin_wines (
      id SERIAL PRIMARY KEY,
      lwin VARCHAR(255),
      producer VARCHAR(500) NOT NULL,
      wine_name VARCHAR(500),
      vintage INTEGER,
      region VARCHAR(255),
      sub_region VARCHAR(255),
      country VARCHAR(255),
      colour VARCHAR(50),
      type VARCHAR(100),
      classification VARCHAR(255),
      vineyard VARCHAR(255),
      appellation VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for fast searching
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lwin_producer ON lwin_wines(producer)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lwin_wine_name ON lwin_wines(wine_name)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lwin_vintage ON lwin_wines(vintage)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lwin_country ON lwin_wines(country)`);
  
  // Create text search indexes for fuzzy matching
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lwin_producer_trgm ON lwin_wines USING gin (producer gin_trgm_ops)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_lwin_wine_name_trgm ON lwin_wines USING gin (wine_name gin_trgm_ops)`);
}

/**
 * Insert LWIN wines into database
 */
async function insertLWINWines(wines: LWINWine[]): Promise<void> {
  // Clear existing data
  await db.execute(sql`TRUNCATE TABLE lwin_wines`);
  
  const batchSize = 1000;
  for (let i = 0; i < wines.length; i += batchSize) {
    const batch = wines.slice(i, i + batchSize);
    
    const values = batch.map(wine => `(
      ${wine.lwin ? `'${wine.lwin.replace(/'/g, "''")}'` : 'NULL'},
      '${wine.producer?.replace(/'/g, "''") || ''}',
      ${wine.wineName ? `'${wine.wineName.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.vintage || 'NULL'},
      ${wine.region ? `'${wine.region.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.subRegion ? `'${wine.subRegion.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.country ? `'${wine.country.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.colour ? `'${wine.colour.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.type ? `'${wine.type.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.classification ? `'${wine.classification.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.vineyard ? `'${wine.vineyard.replace(/'/g, "''")}'` : 'NULL'},
      ${wine.appellation ? `'${wine.appellation.replace(/'/g, "''")}'` : 'NULL'}
    )`).join(',');

    await db.execute(sql.raw(`
      INSERT INTO lwin_wines (
        lwin, producer, wine_name, vintage, region, sub_region, country, 
        colour, type, classification, vineyard, appellation
      ) VALUES ${values}
    `));
    
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(wines.length / batchSize)}`);
  }
}

/**
 * Search for wine matches using fuzzy matching
 */
export async function findWineMatches(searchQuery: string, limit: number = 5): Promise<any[]> {
  try {
    // Clean and prepare search query
    const cleanQuery = searchQuery.trim().replace(/'/g, "''");
    
    // Use PostgreSQL similarity matching
    const results = await db.execute(sql.raw(`
      SELECT 
        lwin,
        producer,
        wine_name,
        vintage,
        region,
        sub_region,
        country,
        colour,
        type,
        classification,
        vineyard,
        appellation,
        (
          GREATEST(
            COALESCE(similarity(producer, '${cleanQuery}'), 0),
            COALESCE(similarity(wine_name, '${cleanQuery}'), 0),
            COALESCE(similarity(CONCAT(producer, ' ', wine_name), '${cleanQuery}'), 0),
            COALESCE(similarity(CONCAT(vintage, ' ', producer, ' ', wine_name), '${cleanQuery}'), 0)
          )
        ) as similarity_score
      FROM lwin_wines
      WHERE 
        (producer ILIKE '%${cleanQuery}%' 
         OR wine_name ILIKE '%${cleanQuery}%'
         OR CONCAT(producer, ' ', wine_name) ILIKE '%${cleanQuery}%')
        OR (
          GREATEST(
            COALESCE(similarity(producer, '${cleanQuery}'), 0),
            COALESCE(similarity(wine_name, '${cleanQuery}'), 0),
            COALESCE(similarity(CONCAT(producer, ' ', wine_name), '${cleanQuery}'), 0)
          ) > 0.3
        )
      ORDER BY similarity_score DESC, producer, wine_name
      LIMIT ${limit}
    `));
    
    return results.rows || [];
  } catch (error) {
    console.error('Error searching wine matches:', error);
    return [];
  }
}

/**
 * Find exact wine match
 */
export async function findExactWineMatch(producer: string, wineName: string, vintage?: number): Promise<any | null> {
  try {
    const cleanProducer = producer.trim().replace(/'/g, "''");
    const cleanWineName = wineName.trim().replace(/'/g, "''");
    
    let vintageCondition = '';
    if (vintage && vintage > 0) {
      vintageCondition = `AND vintage = ${vintage}`;
    }
    
    const results = await db.execute(sql.raw(`
      SELECT *
      FROM lwin_wines
      WHERE 
        LOWER(producer) = LOWER('${cleanProducer}')
        AND LOWER(wine_name) = LOWER('${cleanWineName}')
        ${vintageCondition}
      LIMIT 1
    `));
    
    return results.rows?.[0] || null;
  } catch (error) {
    console.error('Error finding exact wine match:', error);
    return null;
  }
}