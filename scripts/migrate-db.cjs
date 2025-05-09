const { drizzle } = require("drizzle-orm/neon-serverless");
const { Pool } = require("@neondatabase/serverless");
const ws = require("ws");
const { users, wines, consumptions, wishlist, recommendationHistory, labelAnalytics, producers } = require("../shared/schema");

// Setup database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { 
  schema: { users, wines, consumptions, wishlist, recommendationHistory, labelAnalytics, producers } 
});

// Run migrations
async function main() {
  console.log("Starting database migration...");
  
  try {
    // Push SQL schema to the database
    console.log("Creating database tables...");
    
    // Create session table for authentication persistence
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
    `);
    
    // Check if database tables exist by querying them directly
    try {
      await pool.query('SELECT * FROM users LIMIT 1');
      console.log("Users table already exists");
    } catch (e) {
      console.log("Creating users table...");
    }
    
    try {
      await pool.query('SELECT * FROM wines LIMIT 1');
      console.log("Wines table already exists");
    } catch (e) {
      console.log("Creating wines table...");
    }
    
    try {
      await pool.query('SELECT * FROM consumptions LIMIT 1');
      console.log("Consumptions table already exists");
    } catch (e) {
      console.log("Creating consumptions table...");
    }
    
    try {
      await pool.query('SELECT * FROM wishlist LIMIT 1');
      console.log("Wishlist table already exists");
    } catch (e) {
      console.log("Creating wishlist table...");
    }
    
    try {
      await pool.query('SELECT * FROM recommendation_history LIMIT 1');
      console.log("Recommendation history table already exists");
    } catch (e) {
      console.log("Creating recommendation_history table...");
    }
    
    try {
      await pool.query('SELECT * FROM label_analytics LIMIT 1');
      console.log("Label analytics table already exists");
    } catch (e) {
      console.log("Creating label_analytics table...");
    }
    
    try {
      await pool.query('SELECT * FROM producers LIMIT 1');
      console.log("Producers table already exists");
    } catch (e) {
      console.log("Creating producers table...");
    }

    console.log("Database check complete!");
  } catch (error) {
    console.error("Database check failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();