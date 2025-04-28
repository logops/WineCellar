import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertWineSchema, 
  insertConsumptionSchema, 
  insertWishlistSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Error handler function
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: validationError.message,
        errors: err.errors
      });
    }
    return res.status(500).json({ 
      message: err instanceof Error ? err.message : 'Unknown error occurred' 
    });
  };

  // Wine routes
  app.get('/api/wines', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      const wines = await storage.getWinesByUserId(req.user.id);
      res.json(wines);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch wines' });
    }
  });

  app.get('/api/wines/:id', async (req: Request, res: Response) => {
    try {
      const wine = await storage.getWine(Number(req.params.id));
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      res.json(wine);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch wine' });
    }
  });

  app.post('/api/wines', async (req: Request, res: Response) => {
    try {
      const validatedData = insertWineSchema.parse(req.body);
      const wine = await storage.createWine(validatedData);
      res.status(201).json(wine);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch('/api/wines/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updatedWine = await storage.updateWine(id, req.body);
      if (!updatedWine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      res.json(updatedWine);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update wine' });
    }
  });

  app.delete('/api/wines/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await storage.deleteWine(id);
      if (!result) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete wine' });
    }
  });

  // Consumption routes
  app.get('/api/consumptions', async (req: Request, res: Response) => {
    try {
      const consumptions = await storage.getConsumptions();
      res.json(consumptions);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch consumptions' });
    }
  });

  app.post('/api/consumptions', async (req: Request, res: Response) => {
    try {
      const validatedData = insertConsumptionSchema.parse(req.body);
      const consumption = await storage.createConsumption(validatedData);
      res.status(201).json(consumption);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Wishlist routes
  app.get('/api/wishlist', async (req: Request, res: Response) => {
    try {
      const wishlistItems = await storage.getWishlistItems();
      res.json(wishlistItems);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch wishlist items' });
    }
  });

  app.post('/api/wishlist', async (req: Request, res: Response) => {
    try {
      const validatedData = insertWishlistSchema.parse(req.body);
      const wishlistItem = await storage.createWishlistItem(validatedData);
      res.status(201).json(wishlistItem);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete('/api/wishlist/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await storage.deleteWishlistItem(id);
      if (!result) {
        return res.status(404).json({ message: 'Wishlist item not found' });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete wishlist item' });
    }
  });

  // Statistics endpoints
  app.get('/api/statistics', async (req: Request, res: Response) => {
    try {
      const wines = await storage.getWines();
      const consumptions = await storage.getConsumptions();
      const wishlistItems = await storage.getWishlistItems();
      
      // Calculate statistics
      const inCellar = wines.reduce((total, wine) => total + wine.quantity, 0);
      const totalWines = wines.length;
      const consumed = consumptions.reduce((total, consumption) => total + consumption.quantity, 0);
      const purchased = inCellar + consumed;
      const totalValue = wines.reduce((total, wine) => total + (wine.currentValue || 0) * wine.quantity, 0);
      
      // Count types
      const wineTypes = wines.reduce((counts, wine) => {
        const type = wine.type;
        counts[type] = (counts[type] || 0) + wine.quantity;
        return counts;
      }, {} as Record<string, number>);
      
      // Drinking windows
      const readyToDrink = wines.filter(wine => 
        wine.drinkingStatus === 'drink_now' ||
        (wine.drinkingWindowStart && new Date(wine.drinkingWindowStart) <= new Date())
      ).length;
      
      res.json({
        inCellar,
        totalWines,
        consumed,
        purchased,
        totalValue,
        wineTypes,
        readyToDrink,
        wishlistCount: wishlistItems.length
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
