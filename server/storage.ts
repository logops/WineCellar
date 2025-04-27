import {
  users, type User, type InsertUser,
  wines, type Wine, type InsertWine,
  consumptions, type Consumption, type InsertConsumption,
  wishlist, type Wishlist, type InsertWishlist
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Wine operations
  getWines(): Promise<Wine[]>;
  getWine(id: number): Promise<Wine | undefined>;
  createWine(wine: InsertWine): Promise<Wine>;
  updateWine(id: number, wine: Partial<Wine>): Promise<Wine | undefined>;
  deleteWine(id: number): Promise<boolean>;
  
  // Consumption operations
  getConsumptions(): Promise<Consumption[]>;
  getConsumption(id: number): Promise<Consumption | undefined>;
  createConsumption(consumption: InsertConsumption): Promise<Consumption>;
  
  // Wishlist operations
  getWishlistItems(): Promise<Wishlist[]>;
  getWishlistItem(id: number): Promise<Wishlist | undefined>;
  createWishlistItem(item: InsertWishlist): Promise<Wishlist>;
  deleteWishlistItem(id: number): Promise<boolean>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private wines: Map<number, Wine>;
  private consumptions: Map<number, Consumption>;
  private wishlistItems: Map<number, Wishlist>;
  private userId: number;
  private wineId: number;
  private consumptionId: number;
  private wishlistId: number;

  constructor() {
    this.users = new Map();
    this.wines = new Map();
    this.consumptions = new Map();
    this.wishlistItems = new Map();
    this.userId = 1;
    this.wineId = 1;
    this.consumptionId = 1;
    this.wishlistId = 1;
    
    // Add some sample data
    this.initializeData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Wine operations
  async getWines(): Promise<Wine[]> {
    return Array.from(this.wines.values());
  }

  async getWine(id: number): Promise<Wine | undefined> {
    return this.wines.get(id);
  }

  async createWine(insertWine: InsertWine): Promise<Wine> {
    const id = this.wineId++;
    const createdAt = new Date();
    const wine: Wine = { ...insertWine, id, createdAt };
    this.wines.set(id, wine);
    return wine;
  }

  async updateWine(id: number, wineUpdate: Partial<Wine>): Promise<Wine | undefined> {
    const existingWine = this.wines.get(id);
    if (!existingWine) {
      return undefined;
    }
    
    const updatedWine: Wine = { ...existingWine, ...wineUpdate };
    this.wines.set(id, updatedWine);
    return updatedWine;
  }

  async deleteWine(id: number): Promise<boolean> {
    return this.wines.delete(id);
  }

  // Consumption operations
  async getConsumptions(): Promise<Consumption[]> {
    return Array.from(this.consumptions.values());
  }

  async getConsumption(id: number): Promise<Consumption | undefined> {
    return this.consumptions.get(id);
  }

  async createConsumption(insertConsumption: InsertConsumption): Promise<Consumption> {
    const id = this.consumptionId++;
    const createdAt = new Date();
    const consumption: Consumption = { ...insertConsumption, id, createdAt };
    this.consumptions.set(id, consumption);
    
    // Update wine quantity
    const wine = this.wines.get(insertConsumption.wineId);
    if (wine) {
      const updatedWine = { ...wine, quantity: Math.max(0, wine.quantity - insertConsumption.quantity) };
      this.wines.set(wine.id, updatedWine);
    }
    
    return consumption;
  }

  // Wishlist operations
  async getWishlistItems(): Promise<Wishlist[]> {
    return Array.from(this.wishlistItems.values());
  }

  async getWishlistItem(id: number): Promise<Wishlist | undefined> {
    return this.wishlistItems.get(id);
  }

  async createWishlistItem(insertItem: InsertWishlist): Promise<Wishlist> {
    const id = this.wishlistId++;
    const createdAt = new Date();
    const item: Wishlist = { ...insertItem, id, createdAt };
    this.wishlistItems.set(id, item);
    return item;
  }

  async deleteWishlistItem(id: number): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }

  // Initialize sample data
  private initializeData() {
    // Create sample user
    const user: User = { id: this.userId++, username: 'demo', password: 'demo123' };
    this.users.set(user.id, user);

    // Sample wines from the design
    const sampleWines: InsertWine[] = [
      {
        name: 'Cabernet Sauvignon V Madrone Vineyard',
        producer: 'AXR',
        vintage: 2015,
        type: 'red',
        region: 'Napa Valley',
        subregion: '',
        grapeVarieties: 'Cabernet Sauvignon',
        bottleSize: '750ml',
        quantity: 1,
        purchasePrice: 105,
        currentValue: 105,
        purchaseDate: new Date('2020-01-15'),
        purchaseLocation: 'Wine Store',
        rating: 96,
        drinkingWindowStart: new Date('2022-01-01'),
        drinkingWindowEnd: new Date('2030-12-31'),
        drinkingStatus: 'drink_later',
        notes: '',
        userId: user.id
      },
      {
        name: 'Chardonnay',
        producer: 'AXR',
        vintage: 2015,
        type: 'white',
        region: 'Napa Valley',
        subregion: '',
        grapeVarieties: 'Chardonnay',
        bottleSize: '750ml',
        quantity: 1,
        purchasePrice: 35,
        currentValue: 35,
        purchaseDate: new Date('2020-02-15'),
        purchaseLocation: 'Wine Store',
        rating: 92.6,
        drinkingWindowStart: new Date('2021-01-01'),
        drinkingWindowEnd: new Date('2026-12-31'),
        drinkingStatus: 'drink_now',
        notes: '',
        userId: user.id
      },
      {
        name: 'Blanc de Blancs',
        producer: 'Domaine Carneros',
        vintage: 2014,
        type: 'white',
        region: '',
        subregion: '',
        grapeVarieties: 'Chardonnay',
        bottleSize: '750ml',
        quantity: 2,
        purchasePrice: 30,
        currentValue: 30,
        purchaseDate: new Date('2019-12-15'),
        purchaseLocation: 'Winery',
        rating: 92,
        drinkingWindowStart: new Date('2020-01-01'),
        drinkingWindowEnd: new Date('2025-12-31'),
        drinkingStatus: 'drink_now',
        notes: '',
        userId: user.id
      },
      {
        name: 'Brut',
        producer: 'Domaine Carneros',
        vintage: 2014,
        type: 'sparkling',
        region: '',
        subregion: '',
        grapeVarieties: 'Champagne Blend',
        bottleSize: '750ml',
        quantity: 1,
        purchasePrice: 35,
        currentValue: 35,
        purchaseDate: new Date('2020-01-10'),
        purchaseLocation: 'Winery',
        rating: 90.4,
        drinkingWindowStart: new Date('2020-01-01'),
        drinkingWindowEnd: new Date('2024-12-31'),
        drinkingStatus: 'drink_now',
        notes: '',
        userId: user.id
      },
      {
        name: 'Brut Late Disgorged',
        producer: 'Domaine Carneros',
        vintage: 2012,
        type: 'sparkling',
        region: '',
        subregion: '',
        grapeVarieties: 'Champagne Blend',
        bottleSize: '750ml',
        quantity: 3,
        purchasePrice: 56,
        currentValue: 56,
        purchaseDate: new Date('2019-11-20'),
        purchaseLocation: 'Winery',
        rating: 92.6,
        drinkingWindowStart: new Date('2020-01-01'),
        drinkingWindowEnd: new Date('2027-12-31'),
        drinkingStatus: 'drink_later',
        notes: '',
        userId: user.id
      }
    ];

    // Add sample wines to storage
    sampleWines.forEach(wine => {
      const id = this.wineId++;
      const createdAt = new Date();
      this.wines.set(id, { ...wine, id, createdAt });
    });

    // Add sample consumed wine
    const consumedWine: InsertConsumption = {
      wineId: 2, // Reference to the Chardonnay
      consumptionDate: new Date('2023-06-15'),
      quantity: 1,
      notes: 'Enjoyed with seafood dinner',
      rating: 91,
      userId: user.id
    };
    this.consumptions.set(this.consumptionId++, { 
      ...consumedWine, 
      id: this.consumptionId, 
      createdAt: new Date() 
    });

    // Add sample wishlist item
    const wishlistItem: InsertWishlist = {
      name: 'Opus One',
      producer: 'Opus One Winery',
      vintage: 2018,
      type: 'red',
      region: 'Napa Valley',
      subregion: 'Oakville',
      notes: 'Would like to try this Bordeaux blend',
      userId: user.id
    };
    this.wishlistItems.set(this.wishlistId++, { 
      ...wishlistItem, 
      id: this.wishlistId, 
      createdAt: new Date() 
    });
  }
}

export const storage = new MemStorage();
