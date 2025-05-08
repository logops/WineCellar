// Script to import a list of wineries from text files with advanced duplicate checking

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configure Neon WebSocket
globalThis.WebSocket = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Simple normalization to help with duplication check
function normalizeWineryName(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+(winery|vineyards|vineyard|cellars|wines|wine|estate|estates|vintners|cellar|LLC)(\s|$)/g, ' ') // Remove common suffixes
    .trim()
    .replace(/\s+/g, ' '); // Normalize spaces
}

// Check if a winery with the same or very similar name already exists in the database
function isDuplicate(wineryName, existingWineries) {
  const normalizedName = normalizeWineryName(wineryName);
  
  // Direct name match
  if (existingWineries.has(wineryName.toLowerCase())) {
    return true;
  }
  
  // Normalized name match
  if (existingWineries.normalizedNames.has(normalizedName)) {
    return true;
  }
  
  // Check if it's a substring of any existing name or vice versa
  // This helps catch cases like "ABC Winery" vs "ABC"
  // Only consider it a duplicate if the shorter name is at least 70% as long as the longer name
  // Limit number of comparisons to avoid stack overflow
  let comparisonCount = 0;
  for (const existingName of existingWineries.normalizedNames) {
    // Safety limit to prevent stack overflow
    if (comparisonCount++ > 1000) {
      break;
    }
    
    // Skip very short names as they lead to too many false positives
    if (existingName.length < 4 || normalizedName.length < 4) {
      continue;
    }
    
    const lengthRatio = Math.min(normalizedName.length, existingName.length) / 
                        Math.max(normalizedName.length, existingName.length);
    
    // Only compare if names are reasonably similar in length (at least 70%)
    if (lengthRatio < 0.7) {
      continue;
    }
    
    if (normalizedName.includes(existingName) || existingName.includes(normalizedName)) {
      return true;
    }
  }
  
  return false;
}

// Get all existing wineries from the database
async function getExistingWineries() {
  const result = await pool.query('SELECT name, alternate_names FROM producers');
  
  const existingWineries = new Set();
  const normalizedNames = new Set();
  
  for (const row of result.rows) {
    existingWineries.add(row.name.toLowerCase());
    normalizedNames.add(normalizeWineryName(row.name));
    
    // Also add alternate names to the existing set
    if (row.alternate_names && row.alternate_names.length > 0) {
      for (const altName of row.alternate_names) {
        existingWineries.add(altName.toLowerCase());
        normalizedNames.add(normalizeWineryName(altName));
      }
    }
  }
  
  return { 
    size: result.rows.length,
    has: name => existingWineries.has(name.toLowerCase()),
    normalizedNames
  };
}

// Process a file containing winery names
async function processFile(filePath, existingWineries) {
  return new Promise((resolve, reject) => {
    const wineries = [];
    const duplicates = [];
    
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });
    
    rl.on('line', (line) => {
      const name = line.trim();
      if (name && name.length > 0) {
        wineries.push(name);
      }
    });
    
    rl.on('close', () => {
      resolve(wineries);
    });
    
    rl.on('error', (err) => {
      reject(err);
    });
  });
}

// Import wineries from a list, checking for duplicates
async function importWineries(wineries, existingWineries) {
  let imported = 0;
  let skipped = 0;
  const skippedNames = [];
  
  console.log(`Processing ${wineries.length} wineries...`);
  
  for (const name of wineries) {
    if (isDuplicate(name, existingWineries)) {
      skipped++;
      skippedNames.push(name);
      continue;
    }
    
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
      
      // Update our in-memory set of existing wineries to avoid duplicates within the same batch
      existingWineries.normalizedNames.add(normalizeWineryName(name));
      const oldHasMethod = existingWineries.has;
      existingWineries.has = (n) => oldHasMethod(n) || n.toLowerCase() === name.toLowerCase();
      
      imported++;
      
      // Log progress every 50 wineries
      if (imported % 50 === 0) {
        console.log(`Imported ${imported} wineries so far...`);
      }
    } catch (error) {
      console.error(`Error importing winery "${name}":`, error.message);
    }
  }
  
  console.log(`\nImport Results:`);
  console.log(`Total processed: ${wineries.length}`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Skipped as duplicates: ${skipped}`);
  
  if (skipped > 0 && skipped <= 20) {
    console.log(`\nSkipped wineries:`);
    skippedNames.forEach(name => console.log(`- ${name}`));
  } else if (skipped > 20) {
    console.log(`\nFirst 20 skipped wineries:`);
    skippedNames.slice(0, 20).forEach(name => console.log(`- ${name}`));
    console.log(`... and ${skipped - 20} more`);
  }
  
  return { imported, skipped };
}

// Main function
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log("Please provide at least one text file path containing winery names.");
      console.log("Usage: node import-wineries-with-duplicate-check.cjs <file1.txt> [<file2.txt> ...]");
      return;
    }
    
    // Get existing wineries from the database
    console.log("Retrieving existing wineries from the database...");
    const existingWineries = await getExistingWineries();
    console.log(`Found ${existingWineries.size} existing wineries in the database.`);
    
    let totalImported = 0;
    let totalSkipped = 0;
    
    // Process each file
    for (let i = 0; i < args.length; i++) {
      const filePath = args[i];
      console.log(`\nProcessing file (${i+1}/${args.length}): ${filePath}`);
      
      try {
        const wineries = await processFile(filePath, existingWineries);
        console.log(`Found ${wineries.length} winery names in ${filePath}`);
        
        const { imported, skipped } = await importWineries(wineries, existingWineries);
        totalImported += imported;
        totalSkipped += skipped;
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error.message);
      }
    }
    
    // Count total producers
    const result = await pool.query('SELECT COUNT(*) FROM producers');
    console.log(`\nOverall Results:`);
    console.log(`Total wineries imported in this session: ${totalImported}`);
    console.log(`Total wineries skipped as duplicates: ${totalSkipped}`);
    console.log(`Total producers now in database: ${result.rows[0].count}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

main();