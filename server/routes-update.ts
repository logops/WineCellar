import multer from "multer";

// Add these routes to the server/routes.ts file

  // Endpoint to analyze wine labels for removal
  app.post('/api/analyze-for-removal', isAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      
      // Convert image to base64
      const imageBase64 = req.file.buffer.toString('base64');
      
      // Use existing wine label analysis function
      const labelAnalysis = await analyzeWineLabel(imageBase64);
      
      // Get all wines for the current user
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userWines = await dbStorage.getWines(req.user.id);
      
      // Find potential matches based on the label analysis
      // For demonstration, we'll do a simple matching algorithm
      // In a real implementation, this should be more sophisticated
      const matchedWines = userWines.filter(wine => {
        // Only include wines that are still in the cellar
        if (wine.quantity === 0 || wine.consumedStatus === 'consumed') {
          return false;
        }
        
        // Check for producer match (most important)
        if (labelAnalysis.producer && 
            wine.producer && 
            wine.producer.toLowerCase().includes(labelAnalysis.producer.toLowerCase())) {
          return true;
        }
        
        // Check for vintage match
        if (labelAnalysis.vintage && 
            wine.vintage === parseInt(String(labelAnalysis.vintage))) {
          return true;
        }
        
        // Check for name match
        if (labelAnalysis.name && 
            wine.name && 
            wine.name.toLowerCase().includes(labelAnalysis.name.toLowerCase())) {
          return true;
        }
        
        return false;
      });
      
      res.json({
        success: true,
        labelAnalysis,
        matchedWines: matchedWines.slice(0, 5) // Limit to top 5 matches
      });
    } catch (error) {
      console.error('Error analyzing wine label for removal:', error);
      res.status(500).json({ 
        error: 'Failed to analyze wine label',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Endpoint to remove multiple wines at once
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
        const wine = await dbStorage.getWine(id);
        
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
        if (wine.quantity <= 0) {
          results.push({ id, success: false, message: 'Wine already consumed or removed' });
          continue;
        }
        
        // Create consumption record with the provided notes
        try {
          await dbStorage.createConsumption({
            wineId: id,
            quantity: wine.quantity,
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