// Script to import a large list of wineries from a text file

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

// Configure Neon WebSocket
globalThis.WebSocket = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

async function main() {
  console.log("Importing wineries from the text file...");
  
  // Read the winery names from the text file
  const filePath = path.join(__dirname, '../attached_assets/Pasted-Poem-Cellars-Poet-s-Leap-Winery-Poetic-Cellars-Point-Concepci-n-Wines-Pollard-Perse-Pomum-Cellars-Po-1746718432651.txt');
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const wineryNames = fileContent.split('\n').filter(name => name.trim() !== '');
    
    console.log(`Found ${wineryNames.length} winery names in the file.`);
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Process in batches to avoid exceeding query size limits
    const batchSize = 50;
    let totalImported = 0;
    
    for (let i = 0; i < wineryNames.length; i += batchSize) {
      const batch = wineryNames.slice(i, i + batchSize);
      
      // Use individual inserts for each winery to avoid issues with special characters
      let batchSuccessCount = 0;
      for (const name of batch) {
        try {
          // Create an array of alternate names from the winery name
          const nameWords = name.split(' ');
          let alternateNames = [];
          
          // If more than one word, add the first word as an alternate name if it's at least 4 characters
          if (nameWords.length > 1 && nameWords[0].length >= 4) {
            alternateNames.push(nameWords[0]);
          }
          
          // Add the name without "Winery", "Vineyards", etc. if those words are present
          const cleanName = name
            .replace(/\s(Winery|Vineyards|Vineyard|Cellars|Wines|Wine|Estate|Estates|Vintners|Cellar)(\s|$)/gi, '')
            .trim();
            
          if (cleanName !== name && cleanName.length >= 3) {
            alternateNames.push(cleanName);
          }
          
          // Use parameterized query to avoid SQL injection and special character issues
          const query = `
            INSERT INTO producers (name, country, region, alternate_names)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (name) DO NOTHING;
          `;
          
          await pool.query(query, [
            name, 
            'USA', 
            null,
            alternateNames
          ]);
          
          batchSuccessCount++;
        } catch (error) {
          console.error(`Error importing winery "${name}":`, error.message);
        }
      }
      
      console.log(`Imported batch ${i/batchSize + 1} (${batchSuccessCount} of ${batch.length} wineries imported)`);
      totalImported += batchSuccessCount;
    }
    
    // Count total producers
    const result = await pool.query('SELECT COUNT(*) FROM producers');
    console.log(`Total producers in database: ${result.rows[0].count}`);
    console.log(`Successfully processed ${totalImported} wineries from the file.`);
    
    await pool.end();
  } catch (error) {
    console.error("Error reading or processing file:", error);
  }
}

main();