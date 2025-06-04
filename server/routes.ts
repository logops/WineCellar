import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import { storage as dbStorage } from "./storage";
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
import { handleWineLabelAnalysis, handleWineRecommendations, generateDrinkingWindowRecommendation, handleWineInformationLookup } from './anthropic';
import { enhanceWineWithAI } from './aiWineEnhancement';

import { analyzeWineLabelForRemoval } from './labelMatching';

import { 
  processSpreadsheetFile, 
  processBatchFromFile, 
  importProcessedWines,
  ProcessedWine,
  getSheetInfo
} from './spreadsheet';
import path from 'path';
import multer from 'multer';
import { Buffer } from 'buffer';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up multer for file uploads
  // First ensure the temp directory exists
  if (!fs.existsSync('temp')) {
    console.log('Creating temp directory for file uploads');
    fs.mkdirSync('temp', { recursive: true });
  }
  
  const fileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'temp/'); // Store files in 'temp' directory
    },
    filename: function (req, file, cb) {
      // Generate a unique filename to avoid collisions
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      console.log('Generating filename for upload:', uniqueSuffix + '-' + safeFilename);
      cb(null, uniqueSuffix + '-' + safeFilename);
    }
  });

  const upload = multer({ 
    storage: fileStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function(req, file, cb) {
      // Accept only CSV and Excel files
      const acceptedMimeTypes = [
        'text/csv', 
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'application/octet-stream',
        'text/plain' // Some CSV files are sent as text/plain
      ];
      
      // Check file extension as well
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      const validExtensions = ['csv', 'xls', 'xlsx'];
      
      console.log('Upload file type:', file.mimetype, 'Extension:', extension);
      
      if (acceptedMimeTypes.includes(file.mimetype) || (extension && validExtensions.includes(extension))) {
        cb(null, true);
      } else {
        // Use multer's error handling - pass null for the first parameter and false for the second
        // This correctly indicates rejection without causing type errors
        cb(null, false);
        
        // You can also log the error for debugging
        console.error('Invalid file type rejected. Only CSV and Excel files are accepted.');
      }
    }
  });

  // Receipt upload multer configuration
  const receiptUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function(req, file, cb) {
      // Accept images and PDFs for receipts
      const acceptedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
      ];
      
      console.log('Receipt upload file type:', file.mimetype);
      
      if (acceptedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(null, false);
        console.error('Invalid receipt file type. Only images and PDFs are accepted.');
      }
    }
  });
  // Set up authentication
  setupAuth(app);
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };
  
  // Receipt parsing endpoint
  app.post('/api/parse-receipt', isAuthenticated, receiptUpload.single('receipt'), 
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No receipt file uploaded' });
        }

        console.log('Processing receipt upload:', req.file.originalname);
        
        // Convert buffer to base64 for AI analysis
        const base64Image = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        
        // Use Anthropic to analyze the receipt
        const { parseWineReceipt } = await import('./receiptParser');
        const parsedWines = await parseWineReceipt(base64Image, mimeType);
        
        console.log('Parsed wines from receipt:', parsedWines.length);
        
        res.json({
          success: true,
          wines: parsedWines,
          message: `Found ${parsedWines.length} wine${parsedWines.length !== 1 ? 's' : ''} in receipt`
        });
        
      } catch (error) {
        console.error('Receipt parsing error:', error);
        res.status(500).json({ 
          error: 'Failed to parse receipt',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  );

  // Wine label removal endpoints
  app.post('/api/analyze-for-removal', isAuthenticated, multer({ storage: multer.memoryStorage() }).single('image'), 
    async (req: Request, res: Response) => {
      return analyzeWineLabelForRemoval(req, res);
    }
  );
  
  app.post('/api/wines/remove-multiple', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { wineIds, notes } = req.body;
      
      if (!wineIds || !Array.isArray(wineIds) || wineIds.length === 0) {
        return res.status(400).json({ error: 'Wine IDs array is required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const results = [];
      const now = new Date();
      
      // Process each wine
      for (const id of wineIds) {
        // Get the wine to ensure it exists
        const wine = await dbStorage.getWine(Number(id));
        
        if (!wine) {
          results.push({ id, success: false, message: 'Wine not found' });
          continue;
        }
        
        // Verify the wine belongs to the user
        if (wine.userId !== req.user.id) {
          results.push({ id, success: false, message: 'Access denied' });
          continue;
        }
        
        // Only process wines that have quantity > 0
        const quantity = wine.quantity || 0;
        if (quantity <= 0) {
          results.push({ id, success: false, message: 'Wine already consumed or removed' });
          continue;
        }
        
        // Create consumption record with the provided notes
        try {
          await dbStorage.createConsumption({
            wineId: id,
            userId: req.user.id,
            quantity: quantity,
            date: now,
            notes: notes || undefined
          });
        } catch (error) {
          console.error(`Error creating consumption record for wine ${id}:`, error);
          results.push({ id, success: false, message: 'Failed to record consumption' });
          continue;
        }
        
        // Update wine to mark as consumed
        try {
          await dbStorage.updateWine(id, {
            quantity: 0,
            consumedStatus: 'consumed'
          });
          
          results.push({ id, success: true });
        } catch (error) {
          console.error(`Error updating wine ${id}:`, error);
          results.push({ id, success: false, message: 'Failed to update wine' });
        }
      }
      
      res.json({
        success: results.some(r => r.success),
        results
      });
    } catch (error) {
      console.error('Error removing multiple wines:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin routes for user management
  app.get('/api/admin/users', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users to access this endpoint
      const currentUser = req.user;
      if (!currentUser || currentUser.id !== 1) { // Simple admin check - user ID 1 is admin
        return res.status(403).json({ message: "Unauthorized: Admin access required" });
      }
      
      const users = await dbStorage.getAllUsers();
      
      // Sanitize user data by removing passwords
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        // Don't include password in the response
      }));
      
      res.status(200).json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

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
        const wines = await dbStorage.getWinesByUserId(req.user.id);
        
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
      
      const wine = await dbStorage.getWine(Number(req.params.id));
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
      const wine = await dbStorage.createWine(validatedData);
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
      const wine = await dbStorage.getWine(id);
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      
      // Ensure the wine belongs to the current user
      if (wine.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Allow updating all wine fields that are in the request body
      const updateFields: Partial<Wine> = {};
      
      // Copy all fields from the request body to the update object
      // This will ensure we update all fields that the user has edited
      const keysToExclude = ['id', 'userId', 'createdAt'];
      
      for (const key in req.body) {
        if (!keysToExclude.includes(key)) {
          // Use a direct type cast here 
          const wineKey = key as keyof Wine;
          updateFields[wineKey] = req.body[key];
        }
      }
      
      // Make sure we log the entire update operation
      console.log("Updating wine ID:", id, "with fields:", JSON.stringify(updateFields, null, 2));
      
      const updatedWine = await dbStorage.updateWine(id, updateFields);
      
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
      const wine = await dbStorage.getWine(id);
      if (!wine) {
        return res.status(404).json({ message: 'Wine not found' });
      }
      
      // Ensure the wine belongs to the current user
      if (wine.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const result = await dbStorage.deleteWine(id);
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
        const consumptions = await dbStorage.getConsumptionsByUserId(req.user.id);
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
      const wine = await dbStorage.getWine(consumptionData.wineId);
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
      const consumption = await dbStorage.createConsumption(validatedData);
      
      // Update the wine quantity and status based on remaining quantity
      if (remainingQuantity === 0) {
        // If no bottles remain, mark as consumed
        console.log(`Updating wine with fields: { quantity: 0, consumedStatus: 'consumed' }`);
        await dbStorage.updateWine(wine.id, {
          quantity: 0,
          consumedStatus: 'consumed'
        });
      } else {
        // Otherwise just update the quantity
        console.log(`Updating wine with fields: { quantity: ${remainingQuantity}, consumedStatus: 'in_cellar' }`);
        await dbStorage.updateWine(wine.id, {
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
        const wishlistItems = await dbStorage.getWishlistItemsByUserId(req.user.id);
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
      const wishlistItem = await dbStorage.createWishlistItem(validatedData);
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
      const wishlistItem = await dbStorage.getWishlistItem(id);
      if (!wishlistItem) {
        return res.status(404).json({ message: 'Wishlist item not found' });
      }
      
      // Ensure the wishlist item belongs to the current user
      if (wishlistItem.userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const result = await dbStorage.deleteWishlistItem(id);
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
        wines = await dbStorage.getWinesByUserId(userId);
        consumptions = await dbStorage.getConsumptionsByUserId(userId);
        wishlistItems = await dbStorage.getWishlistItemsByUserId(userId);
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
      
      // For purchased count, we need the total number of unique bottles that have been added to the collection
      // This should only count each bottle once and should not increase when a bottle is consumed
      
      // Get all wines (both active and consumed)
      const allWines = wines;
      
      // Calculate purchased by counting the initial quantity of each wine
      // For active wines, this is their current quantity plus consumed bottles
      // For fully consumed wines, this is the total consumed quantity
      let purchased = 0;
      
      // Get count of all bottles ever purchased (original quantities before consumption)
      allWines.forEach(wine => {
        const initialQuantity = wine.quantity || 0; // Current quantity (could be 0 if fully consumed)
        const consumedQuantity = consumptions
          .filter(c => c.wineId === wine.id)
          .reduce((total, c) => total + c.quantity, 0);
          
        // For wines with purchase price, count them in purchased total
        // If no purchase price, it could be a gift or not purchased
        if (wine.purchasePrice && wine.purchasePrice > 0) {
          // Add the total bottles (current + consumed)
          purchased += initialQuantity + consumedQuantity;
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

  // Producer reference routes
  app.get('/api/producers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const query = req.query.search as string;
      
      let producers;
      if (query) {
        // Search for producers matching the query
        producers = await dbStorage.findMatchingProducers(query);
      } else {
        // Get all producers if no search query
        producers = await dbStorage.getProducers();
      }
      
      res.json(producers);
    } catch (err) {
      console.error('Error fetching producers:', err);
      res.status(500).json({ message: 'Failed to fetch producers' });
    }
  });
  
  app.get('/api/producers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const id = Number(req.params.id);
      const producer = await dbStorage.getProducer(id);
      
      if (!producer) {
        return res.status(404).json({ message: 'Producer not found' });
      }
      
      res.json(producer);
    } catch (err) {
      console.error('Error fetching producer:', err);
      res.status(500).json({ message: 'Failed to fetch producer' });
    }
  });
  
  app.post('/api/producers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Check if producer already exists
      const existingProducer = await dbStorage.getProducerByName(req.body.name);
      if (existingProducer) {
        return res.status(400).json({ message: 'Producer with this name already exists' });
      }
      
      // Create producer
      const producer = await dbStorage.createProducer(req.body);
      res.status(201).json(producer);
    } catch (err) {
      console.error('Error creating producer:', err);
      res.status(500).json({ message: 'Failed to create producer' });
    }
  });
  
  app.post('/api/producers/bulk', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const producers = req.body;
      if (!Array.isArray(producers)) {
        return res.status(400).json({ message: 'Expected an array of producers' });
      }
      
      const count = await dbStorage.bulkCreateProducers(producers);
      res.status(201).json({ inserted: count });
    } catch (err) {
      console.error('Error bulk creating producers:', err);
      res.status(500).json({ message: 'Failed to bulk create producers' });
    }
  });

  // AI wine enhancement route
  app.post('/api/enhance-wine', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const wineData = req.body;
      
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ 
          message: 'AI enhancement requires an Anthropic API key. Please configure your API key to enable this feature.' 
        });
      }

      const enhancement = await enhanceWineWithAI(wineData);
      res.json(enhancement);
    } catch (err) {
      console.error('Error enhancing wine:', err);
      res.status(500).json({ 
        message: 'Failed to enhance wine with AI. Please check your API configuration.' 
      });
    }
  });

  // Wine label recognition routes
  app.post('/api/analyze-wine-label', isAuthenticated, async (req: Request, res: Response) => {
    // Check if we should detect multiple bottles
    const detectMultiple = req.query.detectMultiple === 'true';
    
    if (detectMultiple) {
      const { handleMultiBottleAnalysis } = await import('./multiBottleAnalysis');
      return handleMultiBottleAnalysis(req, res);
    } else {
      return handleWineLabelAnalysis(req, res);
    }
  });
  
  // Endpoint to record user feedback on label recognition
  app.post('/api/label-analytics', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { imageHash, originalPrediction, userCorrection, wasAccurate, drinkingWindowAccepted } = req.body;
      
      if (!imageHash || !originalPrediction) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Record the feedback in the database
      await dbStorage.recordLabelAnalytics(
        req.user.id,
        imageHash,
        originalPrediction,
        userCorrection || null,
        wasAccurate || false,
        drinkingWindowAccepted || false
      );
      
      res.status(200).json({ message: 'Label analytics recorded successfully' });
    } catch (error) {
      console.error('Error recording label analytics:', error);
      res.status(500).json({ message: 'Failed to record analytics' });
    }
  });

  // AI Wine recommendation endpoint
  app.post('/api/wine-recommendations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Handle the wine recommendation request
      // Pass in the user's query and their wine collection
      return await handleWineRecommendations(req, res);
    } catch (error) {
      console.error('Error in wine recommendation route:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // Recommendation history endpoints
  app.get('/api/recommendation-history', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get the recommendation history for this user
      const history = await dbStorage.getRecommendationHistory(req.user.id);
      
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching recommendation history:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // API endpoint to get a specific recommendation by ID
  app.get('/api/recommendation-history/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const recommendationId = parseInt(req.params.id);
      if (isNaN(recommendationId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid recommendation ID'
        });
      }
      
      // Get the specific recommendation
      const recommendation = await dbStorage.getRecommendationById(recommendationId);
      
      // Check if recommendation exists and belongs to this user
      if (!recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }
      
      if (recommendation.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this recommendation'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: recommendation
      });
    } catch (error) {
      console.error('Error fetching recommendation by ID:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
  
  // API endpoint for getting AI drinking window recommendation for a single wine
  app.post('/api/wine-drinking-window-recommendation', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Support two flows: 1) Existing wine by ID, 2) Wine data from import without ID
      const { wineId, wineData } = req.body;
      let wine;
      
      if (wineId && !wineData) {
        // Get the wine by ID
        const existingWine = await dbStorage.getWine(Number(wineId));
        if (!existingWine) {
          return res.status(404).json({ 
            success: false, 
            message: 'Wine not found' 
          });
        }
        
        // Ensure the wine belongs to the current user
        if (existingWine.userId !== req.user.id) {
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied' 
          });
        }
        
        wine = existingWine;
      } else if (wineData) {
        // Create a temporary wine object from the provided data
        // Set the userId to current user so AI can use user preferences
        wine = {
          ...wineData,
          id: wineId || -1, // Use a temporary ID if not provided
          userId: req.user.id,
          createdAt: new Date()
        };
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Either Wine ID or Wine Data is required' 
        });
      }
      
      // Get recommendation
      const recommendation = await generateDrinkingWindowRecommendation(wine);
      return res.status(recommendation.success ? 200 : 500).json(recommendation);
    } catch (error) {
      console.error('Error generating drinking window recommendation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Wine information lookup API
  app.post('/api/wine-info-lookup', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Handle the wine information lookup request
      return await handleWineInformationLookup(req, res);
    } catch (error) {
      console.error('Error in wine information lookup route:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Spreadsheet import endpoints
  // Step 1: Get sheet information for selection
  app.post('/api/spreadsheet/sheets', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Read the file from disk
      console.log('Processing uploaded file for sheet info:', req.file.originalname, 'size:', req.file.size, 'bytes', 'path:', req.file.path);
      
      // Read file buffer
      let fileBuffer;
      try {
        fileBuffer = fs.readFileSync(req.file.path);
        console.log('Successfully read file buffer, size:', fileBuffer.length, 'bytes');
      } catch (readError) {
        console.error('Error reading file buffer:', readError);
        return res.status(500).json({
          success: false,
          message: 'Error reading uploaded file'
        });
      }

      // Get sheet information
      const sheetInfo = await getSheetInfo(fileBuffer);
      
      // Store the uploaded file temporarily with a unique ID
      const fileId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000000).toString();
      const tempPath = path.join('temp', fileId + path.extname(req.file.originalname));
      
      // Copy the file to the temporary location
      fs.copyFileSync(req.file.path, tempPath);
      
      // Add file path to the response
      return res.status(sheetInfo.success ? 200 : 400).json({
        ...sheetInfo,
        fileId,
        fileName: req.file.originalname
      });
    } catch (error) {
      console.error('Error processing spreadsheet for sheet info:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  // Step 2: Initial upload and analysis
  app.post('/api/spreadsheet/upload', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Read the file from disk
      const fileBuffer = fs.readFileSync(req.file.path);
      const useAiDrinkingWindows = req.body.useAiDrinkingWindows === 'true';

      // Process the uploaded spreadsheet
      const result = await processSpreadsheetFile(fileBuffer, {
        userId: req.user.id,
        useAiDrinkingWindows
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error uploading spreadsheet:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  // Step 2: Process a batch of rows
  app.post('/api/spreadsheet/process-batch', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    console.log('Processing batch with file:', req.file?.originalname);
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Read the file from disk
      console.log('Processing uploaded file:', req.file.originalname, 'size:', req.file.size, 'bytes', 'path:', req.file.path);
      try {
        const fileExists = fs.existsSync(req.file.path);
        console.log('File exists check:', fileExists);
        
        const stats = fs.statSync(req.file.path);
        console.log('File stats:', stats.size, 'bytes');
      } catch (error) {
        console.error('Error checking file:', error);
      }
      
      // Read file buffer
      let fileBuffer;
      try {
        fileBuffer = fs.readFileSync(req.file.path);
        console.log('Successfully read file buffer, size:', fileBuffer.length, 'bytes');
      } catch (readError) {
        console.error('Error reading file buffer:', readError);
        return res.status(500).json({
          success: false,
          message: 'Error reading uploaded file'
        });
      }
      const batchIndex = parseInt(req.body.batchIndex || '0');
      const batchSize = parseInt(req.body.batchSize || '100');
      const useAiDrinkingWindows = req.body.useAiDrinkingWindows === 'true';
      
      // Get selected sheet index if provided
      let sheetIndex;
      if (req.body.sheetIndex !== undefined) {
        console.log('Using user-selected sheet index:', req.body.sheetIndex);
        sheetIndex = parseInt(req.body.sheetIndex);
      }
      
      // Field mappings are optional - if provided, use them, otherwise detect automatically
      let fieldMappings;
      if (req.body.fieldMappings) {
        try {
          fieldMappings = JSON.parse(req.body.fieldMappings);
        } catch (e) {
          console.error('Error parsing field mappings:', e);
        }
      }

      // Process the batch with AI column mapping if requested
      const useAiColumnMapping = req.body.useAiColumnMapping === 'true';
      
      // Handle the ENTIRE batch at once for seamless UX
      console.log(`Processing complete batch: ${batchSize} wines starting from row ${batchIndex}`);
      
      const result = await processBatchFromFile(fileBuffer, {
        userId: req.user.id,
        useAiDrinkingWindows,
        startRow: batchIndex,
        batchSize: batchSize, // Process the full batch
        fieldMappings,
        useAiColumnMapping,
        sheetIndex // Include selected sheet index if provided
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error processing spreadsheet batch:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });

  // Step 3: Import verified wines
  app.post('/api/spreadsheet/import', isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!req.body.wines || !Array.isArray(req.body.wines)) {
        return res.status(400).json({ 
          success: false, 
          message: 'No wines provided for import' 
        });
      }

      const wines = req.body.wines;
      const createLocations = req.body.createLocations === true;
      const applyAiDrinkingWindows = req.body.applyAiDrinkingWindows === true;
      const importDuplicates = req.body.importDuplicates === true;

      // Import the wines
      const result = await importProcessedWines(wines, {
        userId: req.user.id,
        createLocations,
        applyAiDrinkingWindows,
        importDuplicates
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error importing wines:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });


  


  const httpServer = createServer(app);
  return httpServer;
}
