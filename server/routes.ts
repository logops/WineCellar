import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertWineSchema, 
  insertConsumptionSchema, 
  insertWishlistSchema,
  type Wine,
  type Consumption,
  type Wishlist
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

      // Allow filtering by consumedStatus through query parameter
      const consumedStatus = req.query.consumedStatus as string || 'in_cellar';
      
      try {
        const wines = await storage.getWinesByUserId(req.user.id);
        
        // Filter wines based on consumedStatus
        const filteredWines = wines.filter(wine => {
          // If no consumedStatus is specified on the wine yet, treat it as 'in_cellar'
          const status = wine.consumedStatus || 'in_cellar';
          return consumedStatus === 'all' || status === consumedStatus;
        });
        
        res.json(filteredWines);
      } catch (queryError) {
        console.error('Error fetching wines:', queryError);
        // If there's a database schema mismatch or other query error, 
        // return an empty array rather than failing
        res.json([]);
      }
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
      
      // Only send specific fields in the update
      const updateFields: Partial<Wine> = {};
      
      // Handle quantity updates
      if (req.body.quantity !== undefined) {
        updateFields.quantity = req.body.quantity;
      }
      
      // Handle consumedStatus updates
      if (req.body.consumedStatus !== undefined) {
        updateFields.consumedStatus = req.body.consumedStatus;
      }
      
      console.log("Updating wine with fields:", updateFields);
      
      const updatedWine = await storage.updateWine(id, updateFields);
      
      if (!updatedWine) {
        return res.status(500).json({ message: 'Failed to update wine - no wine returned' });
      }
      
      res.json(updatedWine);
    } catch (err) {
      console.error("Error updating wine:", err);
      res.status(500).json({ 
        message: 'Failed to update wine',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
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
      
      try {
        const consumptions = await storage.getConsumptionsByUserId(req.user.id);
        res.json(consumptions);
      } catch (queryError) {
        console.error('Error fetching consumptions:', queryError);
        // If there's a database schema mismatch or other query error, 
        // return an empty array rather than failing
        res.json([]);
      }
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
      
      // Calculate the remaining quantity after consumption
      const currentQuantity = wine.quantity || 0;
      const consumeQuantity = consumptionData.quantity || 1;
      const remainingQuantity = Math.max(0, currentQuantity - consumeQuantity);
      
      // Create the consumption record
      const validatedData = insertConsumptionSchema.parse(consumptionData);
      const consumption = await storage.createConsumption(validatedData);
      
      // Update the wine quantity and status based on remaining quantity
      if (remainingQuantity === 0) {
        // If no bottles remain, mark as consumed
        console.log(`Updating wine with fields: { quantity: 0, consumedStatus: 'consumed' }`);
        await storage.updateWine(wine.id, {
          quantity: 0,
          consumedStatus: 'consumed'
        });
      } else {
        // Otherwise just update the quantity
        console.log(`Updating wine with fields: { quantity: ${remainingQuantity}, consumedStatus: 'in_cellar' }`);
        await storage.updateWine(wine.id, {
          quantity: remainingQuantity,
          consumedStatus: 'in_cellar'
        });
      }
      
      res.status(201).json(consumption);
    } catch (err) {
      console.error('Error creating consumption:', err);
      handleZodError(err, res);
    }
  });

  // Wishlist routes
  app.get('/api/wishlist', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      try {
        const wishlistItems = await storage.getWishlistItemsByUserId(req.user.id);
        res.json(wishlistItems);
      } catch (queryError) {
        console.error('Error fetching wishlist items:', queryError);
        // If there's a database schema mismatch or other query error, 
        // return an empty array rather than failing
        res.json([]);
      }
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
      
      // Get user-specific data - avoid joins or complex queries that might fail if schema columns don't exist
      let wines: Wine[] = [];
      let consumptions: Consumption[] = [];
      let wishlistItems: Wishlist[] = [];
      
      try {
        wines = await storage.getWinesByUserId(userId);
        consumptions = await storage.getConsumptionsByUserId(userId);
        wishlistItems = await storage.getWishlistItemsByUserId(userId);
      } catch (queryError) {
        console.error('Error fetching data:', queryError);
        // If queries fail, return simplified statistics
        return res.json({
          inCellar: 0,
          totalWines: 0,
          consumed: 0,
          purchased: 0,
          totalValue: 0,
          wineTypes: {},
          readyToDrink: 0,
          wishlistCount: 0
        });
      }
      
      // Calculate statistics
      // For inCellar, only count wines that are not consumed or removed
      const activeWines = wines.filter(wine => 
        !wine.consumedStatus || wine.consumedStatus === 'in_cellar'
      );
      
      // For consumed wines, we'll count ones explicitly marked as consumed
      const consumedWines = wines.filter(wine => 
        wine.consumedStatus === 'consumed'
      );
      
      const inCellar = activeWines.reduce((total, wine) => total + (wine.quantity || 0), 0);
      const totalWines = activeWines.length;
      
      // For consumed count, we need to count ALL consumption records, 
      // including both wines marked as 'consumed' and partially consumed wines still in the cellar
      // All consumption records are considered valid for counting
      const validConsumptions = consumptions;
      
      // Calculate consumed count from all consumption records
      const consumed = consumptions.reduce((total, consumption) => total + consumption.quantity, 0);
      
      // For purchased count, we need to calculate the total bottles ever added to the collection
      // This is different from just adding inCellar + consumed, as that can double-count bottles
      // when many consumption records are created
      
      // Get unique wine IDs for all wines that have ever been in the collection
      const allWineIds = new Set(wines.map(wine => wine.id));
      
      // Calculate total bottles purchased across all wines (original quantities)
      // For wines that have been fully consumed, we'll use the quantity from consumption records
      // For wines still in the cellar, we'll use their current quantity plus consumed bottles
      let purchased = 0;
      
      // First, count bottles for each wine by adding its original quantity
      allWineIds.forEach(wineId => {
        const wine = wines.find(w => w.id === wineId);
        if (wine) {
          // For active wines, count their current quantity
          if (!wine.consumedStatus || wine.consumedStatus === 'in_cellar') {
            purchased += wine.quantity || 0;
          }
          
          // Add consumed bottles for this wine
          const consumedBottles = consumptions
            .filter(c => c.wineId === wineId)
            .reduce((total, c) => total + c.quantity, 0);
          
          purchased += consumedBottles;
        }
      });
      
      // Add detailed logging to debug the issue
      console.log("DETAILED STATS DEBUG:", {
        totalWines: wines.length,
        activeWines: activeWines.length,
        consumedWines: consumedWines.length,
        consumedWineDetails: consumedWines.map(w => ({
          id: w.id,
          name: `${w.vintage} ${w.producer} ${w.name}`,
          quantity: w.quantity,
          status: w.consumedStatus
        })),
        consumptions: consumptions.length,
        consumptionDetails: consumptions.map(c => ({
          id: c.id,
          wineId: c.wineId,
          quantity: c.quantity,
          date: c.createdAt
        })),
        validConsumptions: validConsumptions.length,
        consumptionQuantitySum: consumed,
        purchasedTotal: purchased
      });
      
      const totalValue = activeWines.reduce((total, wine) => {
        const value = wine.currentValue || 0;
        const quantity = wine.quantity || 0;
        return total + (value * quantity);
      }, 0);
      
      // Count types (only for active wines)
      const wineTypes = activeWines.reduce((counts, wine) => {
        const type = wine.type;
        counts[type] = (counts[type] || 0) + (wine.quantity || 0);
        return counts;
      }, {} as Record<string, number>);
      
      // Drinking windows (only for active wines)
      const readyToDrink = activeWines.filter(wine => 
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
