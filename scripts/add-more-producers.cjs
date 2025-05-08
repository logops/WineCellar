// Script to add more producers to the database

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
  console.log("Adding more producers to the database...");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Add more producers
    await pool.query(`
      INSERT INTO producers (name, country, region, alternate_names)
      VALUES 
        ('Shafer Vineyards', 'USA', 'California', '{"Shafer"}'),
        ('Kistler Vineyards', 'USA', 'California', '{"Kistler"}'),
        ('Jordan Vineyard & Winery', 'USA', 'California', '{"Jordan Winery", "Jordan"}'),
        ('Château Mouton Rothschild', 'France', 'Bordeaux', '{"Mouton Rothschild", "Mouton"}'),
        ('Concha y Toro', 'Chile', 'Central Valley', '{"Concha y Toro Winery"}'),
        ('Dominus Estate', 'USA', 'California', '{"Dominus"}'),
        ('Ornellaia', 'Italy', 'Tuscany', '{"Tenuta dell''Ornellaia"}'),
        ('Château Cheval Blanc', 'France', 'Bordeaux', '{"Cheval Blanc"}'),
        ('Stag''s Leap Wine Cellars', 'USA', 'California', '{"Stags Leap", "Stag''s Leap"}'),
        ('Cakebread Cellars', 'USA', 'California', '{"Cakebread"}'),
        ('Trimbach', 'France', 'Alsace', '{"Maison Trimbach"}'),
        ('Hundred Acre', 'USA', 'California', '{"Hundred Acre Vineyard"}'),
        ('Krug', 'France', 'Champagne', '{"Krug Champagne"}'),
        ('Bruno Giacosa', 'Italy', 'Piedmont', '{"Giacosa"}'),
        ('Château Petrus', 'France', 'Bordeaux', '{"Petrus"}'),
        ('Catena Zapata', 'Argentina', 'Mendoza', '{"Bodega Catena Zapata", "Catena"}'),
        ('Bonneau du Martray', 'France', 'Burgundy', '{"Domaine Bonneau du Martray"}'),
        ('Peter Michael Winery', 'USA', 'California', '{"Peter Michael"}'),
        ('Joseph Phelps Vineyards', 'USA', 'California', '{"Joseph Phelps", "Phelps"}'),
        ('Quintessa', 'USA', 'California', '{"Quintessa Estate"}'),
        ('Chateau Musar', 'Lebanon', 'Bekaa Valley', '{"Musar"}'),
        ('Tenuta San Guido', 'Italy', 'Tuscany', '{"San Guido"}'),
        ('Sine Qua Non', 'USA', 'California', '{"SQN"}'),
        ('E. Guigal', 'France', 'Rhône Valley', '{"Guigal"}'),
        ('Mollydooker', 'Australia', 'McLaren Vale', '{"Mollydooker Wines"}'),
        ('Château Cos d''Estournel', 'France', 'Bordeaux', '{"Cos d''Estournel"}'),
        ('Bodegas Muga', 'Spain', 'Rioja', '{"Muga"}'),
        ('Château Palmer', 'France', 'Bordeaux', '{"Palmer"}'),
        ('Diamond Creek Vineyards', 'USA', 'California', '{"Diamond Creek"}'),
        ('Viña Almaviva', 'Chile', 'Maipo Valley', '{"Almaviva"}'),
        ('Marchesi di Barolo', 'Italy', 'Piedmont', '{"Barolo"}'),
        ('Cayuse Vineyards', 'USA', 'Washington', '{"Cayuse"}'),
        ('Château Montrose', 'France', 'Bordeaux', '{"Montrose"}'),
        ('Heitz Cellar', 'USA', 'California', '{"Heitz Wine Cellars", "Heitz"}'),
        ('Domaine Leflaive', 'France', 'Burgundy', '{"Leflaive"}'),
        ('Grosset', 'Australia', 'Clare Valley', '{"Grosset Wines"}'),
        ('Paul Hobbs Winery', 'USA', 'California', '{"Paul Hobbs"}'),
        ('Cloudy Bay', 'New Zealand', 'Marlborough', '{"Cloudy Bay Vineyards"}'),
        ('Alvaro Palacios', 'Spain', 'Priorat', '{"Palacios"}'),
        ('Au Bon Climat', 'USA', 'California', '{"ABC Winery", "Au Bon Climat Winery"}'),
        ('Colgin Cellars', 'USA', 'California', '{"Colgin"}'),
        ('Giacomo Conterno', 'Italy', 'Piedmont', '{"Conterno"}'),
        ('Château Lynch-Bages', 'France', 'Bordeaux', '{"Lynch Bages", "Lynch-Bages"}'),
        ('Louis Jadot', 'France', 'Burgundy', '{"Maison Louis Jadot", "Jadot"}'),
        ('Kumeu River', 'New Zealand', 'Auckland', '{"Kumeu River Wines"}'),
        ('Dr. Loosen', 'Germany', 'Mosel', '{"Weingut Dr. Loosen", "Loosen"}'),
        ('Duckhorn Vineyards', 'USA', 'California', '{"Duckhorn"}'),
        ('Realm Cellars', 'USA', 'California', '{"Realm"}'),
        ('Littorai', 'USA', 'California', '{"Littorai Wines"}')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log("Additional producers added successfully!");

    // Add some more specific California producers
    await pool.query(`
      INSERT INTO producers (name, country, region, alternate_names)
      VALUES 
        ('ADAMVS', 'USA', 'California', '{"ADAMVS Estate"}'),
        ('Arnot-Roberts', 'USA', 'California', '{"Arnot Roberts"}'),
        ('Big Basin Vineyards', 'USA', 'California', '{"Big Basin"}'),
        ('Corison Wines', 'USA', 'California', '{"Corison", "Cathy Corison"}'),
        ('Di Costanzo Wines', 'USA', 'California', '{"Di Costanzo"}'),
        ('Domaine de la Côte', 'USA', 'California', '{"DDLC", "Domaine de la Cote"}'),
        ('Hirsch Vineyards', 'USA', 'California', '{"Hirsch"}'),
        ('Kutch Wines', 'USA', 'California', '{"Kutch"}'),
        ('Matthiasson', 'USA', 'California', '{"Matthiasson Wines"}'),
        ('Newfound Wines', 'USA', 'California', '{"Newfound"}'),
        ('Pax Wines', 'USA', 'California', '{"Pax"}'),
        ('Peay Vineyards', 'USA', 'California', '{"Peay"}'),
        ('Sandlands', 'USA', 'California', '{"Sandlands Wines"}'),
        ('Scribe Winery', 'USA', 'California', '{"Scribe"}'),
        ('Spottswoode', 'USA', 'California', '{"Spottswoode Estate"}'),
        ('Tiberio', 'Italy', 'Abruzzo', '{"Azienda Agricola Tiberio"}')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log("California and Italian producers added successfully!");

    // Count total producers
    const result = await pool.query('SELECT COUNT(*) FROM producers');
    console.log(`Total producers in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error("Error adding producers:", error);
  } finally {
    await pool.end();
  }
}

main();