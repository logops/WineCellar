import { pgTable, text, serial, integer, boolean, date, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Wine table
export const wines = pgTable("wines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  producer: text("producer").notNull(),
  vintage: integer("vintage").notNull(),
  vineyard: text("vineyard"),
  type: text("type").notNull(), // red, white, rose, sparkling, dessert, fortified
  region: text("region"),
  subregion: text("subregion"),
  grapeVarieties: text("grape_varieties"),
  bottleSize: text("bottle_size").default("750ml"),
  quantity: integer("quantity").default(1),
  purchasePrice: real("purchase_price"),
  currentValue: real("current_value"),
  purchaseDate: date("purchase_date"),
  purchaseLocation: text("purchase_location"),
  rating: real("rating"),
  drinkingWindowStart: date("drinking_window_start"),
  drinkingWindowEnd: date("drinking_window_end"),
  drinkingStatus: text("drinking_status").default("drink_later"), // drink_now, drink_later, custom
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id"),
  storageLocation: text("storage_location").default("Main Cellar"),
  binNumber: text("bin_number"),
});

export const insertWineSchema = createInsertSchema(wines).omit({
  id: true,
  createdAt: true
});

// Consumption table
export const consumptions = pgTable("consumptions", {
  id: serial("id").primaryKey(),
  wineId: integer("wine_id").notNull(),
  consumptionDate: date("consumption_date").notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  rating: real("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id"),
});

export const insertConsumptionSchema = createInsertSchema(consumptions).omit({
  id: true,
  createdAt: true
});

// Wishlist table
export const wishlist = pgTable("wishlist", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  producer: text("producer"),
  vintage: integer("vintage"),
  type: text("type"),
  region: text("region"),
  subregion: text("subregion"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id"),
});

export const insertWishlistSchema = createInsertSchema(wishlist).omit({
  id: true,
  createdAt: true
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Wine = typeof wines.$inferSelect;
export type InsertWine = z.infer<typeof insertWineSchema>;

export type Consumption = typeof consumptions.$inferSelect;
export type InsertConsumption = z.infer<typeof insertConsumptionSchema>;

export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
