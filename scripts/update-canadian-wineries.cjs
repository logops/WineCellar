require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// List of known Canadian wineries
const canadianWineries = [
  'Quails\' Gate Winery',
  'Summerhill Pyramid Winery',
  'Tantalus Vineyards',
  'Tinhorn Creek Vineyards',
  'CedarCreek Estate Winery',
  'Inniskillin Okanagan Vineyards',
  'Blue Mountain Vineyard & Cellars',
  'Mission Hill Family Estate',
  'Road 13 Vineyards',
  'Burrowing Owl Estate Winery',
  'Wild Goose Vineyards',
  'Le Vieux Pin Winery',
  'LaStella Winery',
  'Poplar Grove Winery',
  'Painted Rock Estate Winery',
  'Laughing Stock Vineyards',
  'Black Hills Estate Winery',
  'Nk\'Mip Cellars',
  'Dirty Laundry Vineyard',
  'The Hatch',
  'Hester Creek Estate Winery',
  'Culmina Family Estate Winery',
  'Haywire Winery',
  'Okanagan Crush Pad',
  'Fitzpatrick Family Vineyards',
  'CheckMate Artisanal Winery',
  'Hillside Estate Winery',
  'Phantom Creek Estates',
  '50th Parallel Estate',
  'Meyer Family Vineyards',
  'Foxtrot Vineyards',
  'Stag\'s Hollow Winery & Vineyard',
  'Maverick Estate Winery',
  'Nichol Vineyard',
  'St Hubertus & Oak Bay Estate Winery',
  'Thornhaven Estates Winery',
  'Township 7 Vineyards & Winery',
  'Pentâge Wines',
  'Lake Breeze Vineyards',
  'Bench 1775 Winery',
  'Corcelettes Estate Winery',
  'Fairview Cellars',
  'The Grange of Prince Edward Estate Winery',
  'Waupoos Estates Winery',
  'Henry of Pelham Family Estate Winery',
  'Tawse Winery',
  'Flat Rock Cellars',
  'Pelee Island Winery',
  'Stratus Vineyards',
  'Malivoire Wine Company',
  'Hidden Bench Vineyards & Winery',
  'Caroline Cellars Winery',
  'Rosehall Run',
  'Rockway Vineyards',
  'Palatine Hills Estate Winery',
  'Stanners Vineyard',
  'Creekside Estate Winery',
  'Foreign Affair Winery',
  'Southbrook Vineyards',
  'Konzelmann Estate Winery',
  'Ravine Vineyard Estate Winery',
  'Domaine de Chaberton Estate Winery',
  'Lailey Vineyard',
  'Norman Hardie Winery',
  'Hainle Vineyards Estate Winery',
  'Covert Farms Family Estate',
  'Colchester Ridge Estate Winery',
  'Sandhill Winery',
  'Saturna Island Family Estate Winery',
  'Lang Vineyards',
  'Larch Hills Winery',
  'Recline Ridge Vineyards',
  'Red Rooster Winery',
  'Stonechurch Vineyards',
];

async function updateCanadianWineries() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connecting to database...");
    await pool.connect();

    // First, get a list of all wineries and their current country settings
    const result = await pool.query(`
      SELECT id, name, country FROM producers 
      WHERE name = ANY($1)
    `, [canadianWineries]);

    console.log(`Found ${result.rows.length} Canadian wineries in the database.`);

    // Update each winery to have 'Canada' as the country
    let updateCount = 0;
    for (const winery of result.rows) {
      await pool.query(`
        UPDATE producers SET country = 'Canada' WHERE id = $1
      `, [winery.id]);
      updateCount++;
      console.log(`Updated ${winery.name} from ${winery.country || 'NULL'} to Canada`);
    }

    console.log(`\nUpdate Results:`);
    console.log(`Total Canadian wineries found: ${result.rows.length}`);
    console.log(`Total updated: ${updateCount}`);

  } catch (error) {
    console.error("Error updating Canadian wineries:", error);
  } finally {
    await pool.end();
    console.log("Database connection closed.");
  }
}

updateCanadianWineries();