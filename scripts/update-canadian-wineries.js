#!/usr/bin/env tsx
// Script to update Canadian wineries in the database
import { db } from '../server/db.ts';
import { producers } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function updateCanadianWineries() {
  // List of Canadian wineries that were incorrectly labeled as USA
  const canadianWineries = [
    "Quails' Gate Winery",
    "Summerhill Pyramid Winery",
    "Tantalus Vineyards",
    "Tinhorn Creek Vineyards",
    "Mission Hill Family Estate",
    "Inniskillin Wines",
    "CheckMate Artisanal Winery",
    "Norman Hardie Winery",
    "Painted Rock Estate Winery",
    "Burrowing Owl Estate Winery",
    "Okanagan Crush Pad",
    "Arterra Wines Canada",
    "Cave Spring Cellars",
    "Stratus Vineyards",
    "Nk'Mip Cellars",
    "Tawse Winery",
    "Pearl Morissette",
    "Blue Mountain Vineyard",
    "Henry of Pelham Family Estate",
    "Flat Rock Cellars",
    "See Ya Later Ranch",
    "Phantom Creek Estates",
    "Strewn Winery",
    "Benjamin Bridge",
    "Closson Chase Vineyards",
    "Hidden Bench Estate Winery",
    "Redstone Winery",
    "Fielding Estate Winery",
    "Township 7 Vineyards",
    "Bench 1775 Winery"
  ];

  console.log("Updating Canadian wineries...");
  let updatedCount = 0;

  for (const wineryName of canadianWineries) {
    try {
      // Find the winery in the database
      const winery = await db.select().from(producers).where(eq(producers.name, wineryName));
      
      // If the winery exists and currently has 'USA' as country
      if (winery.length > 0 && winery[0].country === 'USA') {
        // Update the winery to have 'Canada' as country
        await db.update(producers)
          .set({ country: 'Canada' })
          .where(eq(producers.name, wineryName));
        
        updatedCount++;
        console.log(`Updated ${wineryName} to Canada`);
      } else if (winery.length === 0) {
        console.log(`Winery not found: ${wineryName}`);
      } else if (winery[0].country !== 'USA') {
        console.log(`Winery ${wineryName} already has country: ${winery[0].country}`);
      }
    } catch (error) {
      console.error(`Error updating ${wineryName}:`, error);
    }
  }

  console.log(`Updated ${updatedCount} wineries to Canada`);
}

// Run the function
updateCanadianWineries()
  .then(() => {
    console.log("Canadian wineries update complete!");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });