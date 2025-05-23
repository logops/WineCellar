import XLSX from 'xlsx';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function loadLWINDatabase() {
  try {
    console.log('🍷 Loading LWIN wine database...');
    
    // Create the wine reference table
    console.log('Creating wine reference table...');
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
        search_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clear existing data
    await db.execute(sql`TRUNCATE TABLE wine_reference`);

    // Create indexes for fast searching
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wine_ref_search_trgm ON wine_reference USING gin (search_text gin_trgm_ops)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wine_ref_producer ON wine_reference(producer)`);

    console.log('Reading LWIN Excel file...');
    const workbook = XLSX.readFile('attached_assets/LWINdatabase.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log('Converting to JSON...');
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length === 0) {
      throw new Error('No data found in LWIN database');
    }

    const headers = data[0] as string[];
    console.log('Headers found:', headers.slice(0, 5), '... and more');
    console.log(`Total rows: ${data.length}`);

    // Process data in batches
    const batchSize = 500;
    let processed = 0;
    let inserted = 0;

    for (let i = 1; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const wines = [];

      for (const row of batch) {
        const wine: any = {};
        
        // Map data based on headers
        headers.forEach((header, index) => {
          const value = (row as any[])[index];
          if (value && header) {
            const h = header.toLowerCase();
            
            if (h.includes('lwin')) wine.lwin = String(value);
            else if (h.includes('producer') || h.includes('winery')) wine.producer = String(value);
            else if (h.includes('wine') && h.includes('name')) wine.wine_name = String(value);
            else if (h.includes('vintage') || h.includes('year')) {
              const vintage = parseInt(String(value));
              if (vintage > 1800 && vintage <= 2030) wine.vintage = vintage;
            }
            else if (h.includes('region') && !h.includes('sub')) wine.region = String(value);
            else if (h.includes('country')) wine.country = String(value);
            else if (h.includes('type')) wine.wine_type = String(value);
            else if (h.includes('color') || h.includes('colour')) wine.color = String(value);
          }
        });

        // Only include wines with essential data
        if (wine.producer && (wine.wine_name || wine.lwin)) {
          // Create search text
          const searchParts = [
            wine.producer,
            wine.wine_name,
            wine.vintage,
            wine.region,
            wine.country
          ].filter(Boolean);
          
          wine.search_text = searchParts.join(' ').toLowerCase();
          wines.push(wine);
        }
      }

      // Insert batch
      if (wines.length > 0) {
        const values = wines.map(wine => {
          const escape = (str: any) => str ? `'${String(str).replace(/'/g, "''")}'` : 'NULL';
          
          return `(
            ${escape(wine.lwin)},
            ${escape(wine.producer)},
            ${escape(wine.wine_name)},
            ${wine.vintage || 'NULL'},
            ${escape(wine.region)},
            ${escape(wine.country)},
            ${escape(wine.wine_type)},
            ${escape(wine.color)},
            ${escape(wine.search_text)}
          )`;
        }).join(',');

        await db.execute(sql.raw(`
          INSERT INTO wine_reference (
            lwin, producer, wine_name, vintage, region, country, 
            wine_type, color, search_text
          ) VALUES ${values}
        `));

        inserted += wines.length;
      }

      processed += batch.length;
      console.log(`Processed ${processed}/${data.length - 1} rows, inserted ${inserted} wines`);
    }

    console.log(`✅ LWIN database loaded successfully!`);
    console.log(`📊 Total wines in database: ${inserted}`);
    console.log(`🎯 Wine matching is now available for imports!`);

  } catch (error) {
    console.error('❌ Error loading LWIN database:', error);
    throw error;
  }
}

// Run the loader
loadLWINDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));