import { useState, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, FileSpreadsheet, Check, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import WineImportCard from './WineImportCard';
import { apiRequest } from '@/lib/queryClient';

// Interface for field mapping
interface FieldMapping {
  field: string;
  columnHeader: string;
  columnIndex: number;
  confidence: 'high' | 'medium' | 'low';
}

// Interface for processed wine data
interface ProcessedWine {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: any;
  confidence: 'high' | 'medium' | 'low';
  missingRequiredFields: string[];
  isPotentialDuplicate: boolean;
  duplicateId?: number;
  needsVerification: boolean;
  storageLocation?: string;
  aiDrinkingWindowRecommendation?: {
    start?: string;
    end?: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  };
}

// Interface for batch processing result
interface BatchProcessResult {
  processedWines: ProcessedWine[];
  fieldMappings: FieldMapping[];
  totalRows: number;
  processedRows: number;
  newLocations: string[];
  potentialDuplicatesCount: number;
  needsVerificationCount: number;
  highConfidenceCount: number;
}

// Interface for import result
interface ImportResult {
  imported: number;
  skipped: number;
  errors: any[];
  importedWines: any[];
}

export default function SpreadsheetImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for managing file and import process
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [useAiDrinkingWindows, setUseAiDrinkingWindows] = useState(true);
  const [viewMode, setViewMode] = useState<'interpreted' | 'original'>('interpreted');
  
  // State for import data
  const [totalRows, setTotalRows] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [processedWines, setProcessedWines] = useState<ProcessedWine[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Settings for import
  const [importDuplicates, setImportDuplicates] = useState(false);
  const [createLocations, setCreateLocations] = useState(true);
  const [applyAiDrinkingWindows, setApplyAiDrinkingWindows] = useState(true);
  
  // State for tracking import stage
  const [importStage, setImportStage] = useState<'upload' | 'verification' | 'complete'>('upload');
  const [activeTab, setActiveTab] = useState<'all' | 'verification' | 'duplicates'>('all');
  
  // Function to handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Check file type
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileType !== 'csv' && fileType !== 'xlsx' && fileType !== 'xls') {
        toast({
          title: "Unsupported file type",
          description: "Please upload a CSV or Excel file",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
      
      // Reset states when a new file is selected
      setImportStage('upload');
      setProcessedWines([]);
      setFieldMappings([]);
      setTotalRows(0);
      setProcessedRows(0);
      setImportResult(null);
    }
  };
  
  // Function to trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Function to upload and analyze file
  const uploadFile = async () => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('useAiDrinkingWindows', useAiDrinkingWindows.toString());
      
      const response = await fetch('/api/spreadsheet/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to upload file');
      }
      
      setFieldMappings(result.data.fieldMappings);
      setTotalRows(result.data.totalRows);
      
      // Start processing the batches
      await processBatches();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Function to process batches
  const processBatches = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProcessedWines([]);
    setProcessedRows(0);
    
    try {
      const batchSize = 100;
      let currentBatch = 0;
      let hasMoreData = true;
      
      // Process batches until all rows are processed
      while (hasMoreData) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('batchIndex', currentBatch.toString());
        formData.append('batchSize', batchSize.toString());
        formData.append('useAiDrinkingWindows', useAiDrinkingWindows.toString());
        
        // Include field mappings from the initial upload
        if (fieldMappings.length > 0) {
          formData.append('fieldMappings', JSON.stringify(fieldMappings));
        }
        
        const response = await fetch('/api/spreadsheet/process-batch', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (!result.success) {
          if (result.message === 'No more data to process') {
            hasMoreData = false;
          } else {
            throw new Error(result.message || 'Failed to process batch');
          }
        } else {
          const batchResult: BatchProcessResult = result.data;
          
          // Update processed rows count
          setProcessedRows(prev => prev + batchResult.processedRows);
          
          // Add processed wines to state
          setProcessedWines(prev => [...prev, ...batchResult.processedWines]);
          
          // Check if we have more data to process
          hasMoreData = batchResult.processedRows === batchSize;
          
          // Increment batch index
          currentBatch++;
        }
      }
      
      // All batches processed, move to verification stage
      setImportStage('verification');
    } catch (error) {
      console.error('Error processing batches:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Function to import verified wines
  const importWines = async () => {
    // Get the wines to import based on user selection
    const winesToImport = activeTab === 'all' 
      ? processedWines 
      : activeTab === 'verification' 
        ? processedWines.filter(wine => wine.needsVerification && !wine.isPotentialDuplicate)
        : processedWines.filter(wine => wine.isPotentialDuplicate);
    
    setIsImporting(true);
    
    try {
      const response = await apiRequest('POST', '/api/spreadsheet/import', {
        wines: winesToImport,
        createLocations,
        applyAiDrinkingWindows,
        importDuplicates
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to import wines');
      }
      
      setImportResult(result.data);
      setImportStage('complete');
      
      toast({
        title: "Import successful",
        description: `Imported ${result.data.imported} wines. Skipped ${result.data.skipped} wines.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error importing wines:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Reset the import process
  const resetImport = () => {
    setFile(null);
    setImportStage('upload');
    setProcessedWines([]);
    setFieldMappings([]);
    setTotalRows(0);
    setProcessedRows(0);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Get counts for each category
  const needsVerificationCount = processedWines.filter(wine => wine.needsVerification && !wine.isPotentialDuplicate).length;
  const duplicatesCount = processedWines.filter(wine => wine.isPotentialDuplicate).length;
  const highConfidenceCount = processedWines.filter(wine => !wine.needsVerification).length;
  
  // Get wines based on active tab
  const filteredWines = useCallback(() => {
    if (activeTab === 'all') return processedWines;
    if (activeTab === 'verification') return processedWines.filter(wine => wine.needsVerification && !wine.isPotentialDuplicate);
    if (activeTab === 'duplicates') return processedWines.filter(wine => wine.isPotentialDuplicate);
    return processedWines;
  }, [activeTab, processedWines]);
  
  // Render upload stage
  const renderUploadStage = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Import Wines from Spreadsheet</CardTitle>
        <CardDescription>
          Upload a CSV or Excel file to import your wine collection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 transition-all cursor-pointer" onClick={triggerFileInput}>
          <input 
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <FileSpreadsheet size={48} className="text-primary mb-2" />
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload size={48} className="text-gray-400 mb-2" />
              <p className="text-lg font-medium">Click to select a file</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="use-ai">Use AI for drinking windows</Label>
              <p className="text-sm text-gray-500">Generate drinking window recommendations for wines that don't have them</p>
            </div>
            <Switch 
              id="use-ai"
              checked={useAiDrinkingWindows}
              onCheckedChange={setUseAiDrinkingWindows}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={resetImport}>
          Cancel
        </Button>
        <Button 
          onClick={uploadFile} 
          disabled={!file || isUploading || isProcessing}
        >
          {(isUploading || isProcessing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : 'Upload and Analyze'}
        </Button>
      </CardFooter>
    </Card>
  );
  
  // Render verification stage
  const renderVerificationStage = () => (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle>Verify and Import Wines</CardTitle>
        <CardDescription>
          Review the wines extracted from your spreadsheet before importing them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">Import Summary</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">View:</span>
              <div className="border rounded-md p-1">
                <Button 
                  variant={viewMode === 'interpreted' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('interpreted')}
                  className="rounded-r-none"
                >
                  Interpreted
                </Button>
                <Button 
                  variant={viewMode === 'original' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setViewMode('original')}
                  className="rounded-l-none"
                >
                  Original
                </Button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Total Wines</div>
              <div className="text-2xl font-semibold">{processedWines.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Ready to Import</div>
              <div className="text-2xl font-semibold text-green-600">{highConfidenceCount}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Needs Verification</div>
              <div className="text-2xl font-semibold text-yellow-600">{needsVerificationCount}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Potential Duplicates</div>
              <div className="text-2xl font-semibold text-blue-600">{duplicatesCount}</div>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-locations">Create storage locations</Label>
                <p className="text-sm text-gray-500">Automatically create storage locations from the spreadsheet</p>
              </div>
              <Switch 
                id="create-locations"
                checked={createLocations}
                onCheckedChange={setCreateLocations}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-drinking-windows">Apply AI drinking windows</Label>
                <p className="text-sm text-gray-500">Use AI-recommended drinking windows when available</p>
              </div>
              <Switch 
                id="ai-drinking-windows"
                checked={applyAiDrinkingWindows}
                onCheckedChange={setApplyAiDrinkingWindows}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="import-duplicates">Import potential duplicates</Label>
                <p className="text-sm text-gray-500">Import wines that appear to be duplicates of existing entries</p>
              </div>
              <Switch 
                id="import-duplicates"
                checked={importDuplicates}
                onCheckedChange={setImportDuplicates}
              />
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All Wines
              <Badge variant="outline" className="ml-2">{processedWines.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="verification">
              Needs Verification
              <Badge variant="outline" className="ml-2">{needsVerificationCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="duplicates">
              Potential Duplicates
              <Badge variant="outline" className="ml-2">{duplicatesCount}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <div className="space-y-4">
              {filteredWines().length > 0 ? (
                filteredWines().map((wine) => (
                  <WineImportCard 
                    key={wine.rowIndex} 
                    wine={wine} 
                    viewMode={viewMode}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No wines to display</div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="verification" className="mt-4">
            <div className="space-y-4">
              {filteredWines().length > 0 ? (
                filteredWines().map((wine) => (
                  <WineImportCard 
                    key={wine.rowIndex} 
                    wine={wine} 
                    viewMode={viewMode}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No wines need verification</div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="duplicates" className="mt-4">
            <div className="space-y-4">
              {filteredWines().length > 0 ? (
                filteredWines().map((wine) => (
                  <WineImportCard 
                    key={wine.rowIndex} 
                    wine={wine} 
                    viewMode={viewMode}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No potential duplicates found</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={resetImport}>
          Cancel
        </Button>
        <Button 
          onClick={importWines} 
          disabled={isImporting || processedWines.length === 0}
        >
          {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isImporting ? 'Importing...' : 'Import Wines'}
        </Button>
      </CardFooter>
    </Card>
  );
  
  // Render completion stage
  const renderCompletionStage = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Import Complete</CardTitle>
        <CardDescription>
          Your wines have been successfully imported.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-6">
          <Check size={64} className="text-green-500 mb-4" />
          
          <h3 className="text-xl font-medium">Import Summary</h3>
          
          <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-md">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Imported</div>
              <div className="text-2xl font-semibold text-green-600">{importResult?.imported || 0}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Skipped</div>
              <div className="text-2xl font-semibold text-gray-600">{importResult?.skipped || 0}</div>
            </div>
          </div>
          
          {importResult?.errors && importResult.errors.length > 0 && (
            <div className="mt-6 w-full">
              <h4 className="text-lg font-medium mb-2">Errors</h4>
              <div className="border rounded-md p-3 bg-red-50 max-h-40 overflow-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 mb-1">
                    {error.error}: {error.wine.producer} {error.wine.name} {error.wine.vintage}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={resetImport}>
          Import More Wines
        </Button>
      </CardFooter>
    </Card>
  );
  
  // Render the appropriate stage
  return (
    <div className="w-full p-4">
      {importStage === 'upload' && renderUploadStage()}
      {importStage === 'verification' && renderVerificationStage()}
      {importStage === 'complete' && renderCompletionStage()}
    </div>
  );
}