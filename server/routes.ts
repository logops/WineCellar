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

  app.get('/api/wines/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const wine = await storage.getWine(Number(req.params.id));
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      
      // Ensure the wine belongs to the current user
      if (wine.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(wine);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch wine' });
    }
  });

  app.post('/api/wines', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Add the current user's ID to the wine data
      const wineData = {
        ...req.body,
        userId: req.user.id
      };
      
      const validatedData = insertWineSchema.parse(wineData);
      const wine = await storage.createWine(validatedData);
      res.status(201).json(wine);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch('/api/wines/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const id = Number(req.params.id);
      
      // Get the wine to check ownership
      const wine = await storage.getWine(id);
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      
      // Ensure the wine belongs to the current user
      if (wine.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedWine = await storage.updateWine(id, req.body);
      res.json(updatedWine);
    } catch (err) {
      res.status(500).json({ message: 'Failed to update wine' });
    }
  });

  app.delete('/api/wines/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const id = Number(req.params.id);
      
      // Get the wine to check ownership
      const wine = await storage.getWine(id);
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      
      // Ensure the wine belongs to the current user
      if (wine.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const result = await storage.deleteWine(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete wine' });
    }
  });

  // Consumption routes
  app.get('/api/consumptions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const consumptions = await storage.getConsumptionsByUserId(req.user.id);
      res.json(consumptions);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch consumptions' });
    }
  });

  app.post('/api/consumptions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Add the current user's ID to the consumption data
      const consumptionData = {
        ...req.body,
        userId: req.user.id
      };
      
      // Verify that the wine belongs to the current user
      const wine = await storage.getWine(consumptionData.wineId);
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      
      if (wine.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const validatedData = insertConsumptionSchema.parse(consumptionData);
      const consumption = await storage.createConsumption(validatedData);
      res.status(201).json(consumption);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Wishlist routes
  app.get('/api/wishlist', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const wishlistItems = await storage.getWishlistItemsByUserId(req.user.id);
      res.json(wishlistItems);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch wishlist items' });
    }
  });

  app.post('/api/wishlist', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Add the current user's ID to the wishlist data
      const wishlistData = {
        ...req.body,
        userId: req.user.id
      };
      
      const validatedData = insertWishlistSchema.parse(wishlistData);
      const wishlistItem = await storage.createWishlistItem(validatedData);
      res.status(201).json(wishlistItem);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete('/api/wishlist/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const id = Number(req.params.id);
      
      // Get the wishlist item to check ownership
      const wishlistItem = await storage.getWishlistItem(id);
      if (!wishlistItem) {
        return res.status(404).json({ message: 'Wishlist item not found' });
      }
      
      // Ensure the wishlist item belongs to the current user
      if (wishlistItem.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const result = await storage.deleteWishlistItem(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete wishlist item' });
    }
  });

  // Statistics endpoints
  app.get('/api/statistics', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const userId = req.user.id;
      
      // Get user-specific data
      const wines = await storage.getWinesByUserId(userId);
      const consumptions = await storage.getConsumptionsByUserId(userId);
      const wishlistItems = await storage.getWishlistItemsByUserId(userId);
      
      // Calculate statistics
      const inCellar = wines.reduce((total, wine) => total + (wine.quantity || 0), 0);
      const totalWines = wines.length;
      const consumed = consumptions.reduce((total, consumption) => total + consumption.quantity, 0);
      const purchased = inCellar + consumed;
      const totalValue = wines.reduce((total, wine) => {
        const value = wine.currentValue || 0;
        const quantity = wine.quantity || 0;
        return total + (value * quantity);
      }, 0);
      
      // Count types
      const wineTypes = wines.reduce((counts, wine) => {
        const type = wine.type;
        counts[type] = (counts[type] || 0) + (wine.quantity || 0);
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
      console.error('Statistics error:', err);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
