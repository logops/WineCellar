-- Session table for authentication
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL
);

-- Wines table
CREATE TABLE IF NOT EXISTS "wines" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "producer" TEXT NOT NULL,
  "vintage" INTEGER NOT NULL,
  "vineyard" TEXT,
  "type" TEXT NOT NULL,
  "region" TEXT,
  "subregion" TEXT,
  "grape_varieties" TEXT,
  "bottle_size" TEXT DEFAULT '750ml',
  "quantity" INTEGER DEFAULT 1,
  "purchase_price" REAL,
  "current_value" REAL,
  "purchase_date" DATE,
  "purchase_location" TEXT,
  "storage_location" TEXT DEFAULT 'Main Cellar',
  "rating" REAL,
  "drinking_window_start" DATE,
  "drinking_window_end" DATE,
  "drinking_status" TEXT DEFAULT 'drink_later',
  "consumed_status" TEXT DEFAULT 'in_cellar',
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "user_id" INTEGER,
  "bin_number" TEXT
);

-- Consumptions table
CREATE TABLE IF NOT EXISTS "consumptions" (
  "id" SERIAL PRIMARY KEY,
  "wine_id" INTEGER NOT NULL,
  "consumption_date" DATE NOT NULL,
  "quantity" INTEGER NOT NULL,
  "notes" TEXT,
  "rating" REAL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "user_id" INTEGER
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS "wishlist" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "producer" TEXT,
  "vintage" INTEGER,
  "type" TEXT,
  "region" TEXT,
  "subregion" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "user_id" INTEGER
);

-- Recommendation history table
CREATE TABLE IF NOT EXISTS "recommendation_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "query" TEXT NOT NULL,
  "recommendations" JSONB NOT NULL,
  "additional_suggestions" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Label analytics table
CREATE TABLE IF NOT EXISTS "label_analytics" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "image_hash" VARCHAR(64),
  "original_prediction" JSONB NOT NULL,
  "user_correction" JSONB,
  "was_accurate" BOOLEAN DEFAULT FALSE,
  "drinking_window_accepted" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Producers reference table
CREATE TABLE IF NOT EXISTS "producers" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "alternate_names" TEXT[],
  "is_verified" BOOLEAN DEFAULT TRUE,
  "region" TEXT,
  "country" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);