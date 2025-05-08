// Script to create tables directly using raw SQL
// CommonJS module

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon WebSocket
globalThis.WebSocket = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

async function main() {
  console.log("Creating tables in the database...");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create producers table directly using SQL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "producers" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "alternate_names" TEXT[] DEFAULT '{}',
        "is_verified" BOOLEAN DEFAULT true,
        "region" TEXT,
        "country" TEXT,
        "created_at" TIMESTAMP DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      );
    `);
    
    console.log("Producers table created successfully!");
    
    // Add some initial producers
    await pool.query(`
      INSERT INTO producers (name, country, region, alternate_names)
      VALUES 
        ('Ridge Vineyards', 'USA', 'California', '{"Ridge"}'),
        ('Domaine de la Romanée-Conti', 'France', 'Burgundy', '{"DRC", "Romanée-Conti"}'),
        ('Château Lafite Rothschild', 'France', 'Bordeaux', '{"Lafite Rothschild", "Lafite"}'),
        ('Opus One', 'USA', 'California', '{"Opus One Winery"}'),
        ('Penfolds', 'Australia', 'South Australia', '{"Penfolds Wines", "Penfolds Grange"}'),
        ('Antinori', 'Italy', 'Tuscany', '{"Marchesi Antinori", "Antinori Family"}'),
        ('Château Margaux', 'France', 'Bordeaux', '{"Margaux"}'),
        ('Domaine Leroy', 'France', 'Burgundy', '{"Leroy"}'),
        ('Chateau Montelena', 'USA', 'California', '{"Montelena"}'),
        ('Tignanello', 'Italy', 'Tuscany', '{"Tignanello Estate", "Tenuta Tignanello"}'),
        ('Cloudy Bay', 'New Zealand', 'Marlborough', '{"Cloudy Bay Vineyards"}'),
        ('Vega Sicilia', 'Spain', 'Ribera del Duero', '{"Bodegas Vega Sicilia"}'),
        ('Screaming Eagle', 'USA', 'California', '{"Screaming Eagle Winery"}'),
        ('Château d''Yquem', 'France', 'Bordeaux', '{"d''Yquem", "Yquem"}'),
        ('Sassicaia', 'Italy', 'Tuscany', '{"Tenuta San Guido Sassicaia"}'),
        ('Caymus Vineyards', 'USA', 'California', '{"Caymus"}'),
        ('Silver Oak', 'USA', 'California', '{"Silver Oak Cellars"}'),
        ('Gaja', 'Italy', 'Piedmont', '{"Angelo Gaja", "Gaja Winery"}'),
        ('Château Latour', 'France', 'Bordeaux', '{"Latour"}'),
        ('Harlan Estate', 'USA', 'California', '{"Harlan"}')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log("Initial producers added successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await pool.end();
  }
}

main();