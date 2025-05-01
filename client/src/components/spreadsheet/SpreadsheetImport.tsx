import React, { useState, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, FileSpreadsheet, ArrowRight, Check, X, Ban, AlertTriangle } from "lucide-react";
import WineImportCard from './WineImportCard';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, uploadFile, queryClient } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types for the wine data we'll receive from the backend
interface ProcessedWine {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: Partial<{
    name: string;
    producer: string;
    vintage: number | 'NV';
    type: string;
    vineyard?: string;
    region?: string;
    subregion?: string;
    grapeVarieties?: string;
    bottleSize?: string;
    quantity?: number;
    purchasePrice?: number;
    currentValue?: number;
    purchaseDate?: string;
    purchaseLocation?: string;
    drinkingWindowStart?: string;
    drinkingWindowEnd?: string;
    drinkingStatus?: string;
    storageLocation?: string;
    notes?: string;
    rating?: number;
    binNumber?: string;
  }>;
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

interface FieldMapping {
  field: string;
  columnHeader: string;
  columnIndex: string; // Column index can be a string
  confidence: 'high' | 'medium' | 'low';
}

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

const SpreadsheetImport: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedBatch, setProcessedBatch] = useState<BatchProcessResult | null>(null);
  const [allProcessedWines, setAllProcessedWines] = useState<ProcessedWine[]>([]);
  const [approvedWines, setApprovedWines] = useState<ProcessedWine[]>([]);
  const [rejectedWines, setRejectedWines] = useState<ProcessedWine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalBatches, setTotalBatches] = useState(1);
  const [batchSize, setBatchSize] = useState(100);
  const [importFinished, setImportFinished] = useState(false);
  const [editingWine, setEditingWine] = useState<ProcessedWine | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileData: FormData) => {
      const response = await uploadFile('/api/spreadsheet/upload', fileData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded successfully",
        description: `${data.rowCount} rows detected. Starting processing...`,
      });
      setTotalBatches(Math.ceil(data.rowCount / batchSize));
      processBatch(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  });

  // Process batch mutation
  const processBatchMutation = useMutation({
    mutationFn: async ({ index }: { index: number }) => {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
        formData.append('batchIndex', index.toString());
        formData.append('batchSize', batchSize.toString());
        formData.append('useAiColumnMapping', 'true'); // Enable AI-powered column mapping
        formData.append('useAiDrinkingWindows', 'true'); // Enable AI recommendations for drinking windows
        
        try {
          console.log('Uploading file for batch processing:', file.name, 'size:', file.size);
          const response = await uploadFile('/api/spreadsheet/process-batch', formData);
          return response.json();
        } catch (error) {
          console.error('Error uploading file:', error);
          throw error;
        }
      } else {
        throw new Error('No file selected');
      }
    },
    onSuccess: (response: any) => {
      // Check if the response is wrapped in a data property
      const data = response.data || response;
      setProcessedBatch(data);
      // Ensure processedWines exists and is an array before spreading
      const wines = data.processedWines || [];
      setAllProcessedWines(prev => [...prev, ...wines]);
      setCurrentBatchIndex(prev => prev + 1);
      
      if (currentBatchIndex + 1 < totalBatches) {
        toast({
          title: "Batch processed",
          description: `Processed ${data.processedRows || 0} rows. Processing next batch...`,
        });
        processBatch(currentBatchIndex + 1);
      } else {
        toast({
          title: "Processing complete",
          description: `Processed ${allProcessedWines.length + (data.processedWines ? data.processedWines.length : 0)} wines. Please review before importing.`,
        });
        setActiveTab('review');
        setLoading(false);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  });

  // Import wines mutation
  const importWinesMutation = useMutation({
    mutationFn: async (wines: ProcessedWine[]) => {
      try {
        console.log('Importing wines:', wines.length);
        const response = await apiRequest('POST', '/api/spreadsheet/import', { wines });
        return response.json();
      } catch (error) {
        console.error('Error importing wines:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: `${data.importedCount} wines have been added to your collection.`,
      });
      setImportFinished(true);
      setActiveTab('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/wines'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    // Check if file type is acceptable (Excel or CSV)
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ];
    
    if (!allowedTypes.includes(selectedFile.type) && 
        !selectedFile.name.endsWith('.csv') && 
        !selectedFile.name.endsWith('.xlsx') && 
        !selectedFile.name.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file (.csv)",
        variant: "destructive",
      });
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    // Start the initial upload progress - faster at first to indicate file transmission
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 60) {
          clearInterval(uploadInterval);
          return 60;
        }
        return prev + 10; // Move faster initially
      });
    }, 100);
    
    // Set a timeout to indicate processing is happening
    setTimeout(() => {
      toast({
        title: "Processing data",
        description: "Analyzing columns and wine data. This may take a minute..."
      });
      
      // Start a slower processing indicator
      const processingInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(processingInterval);
            return 90;
          }
          return prev + 1; // Move slower during processing
        });
      }, 700);
      
      // Clean up processing interval when component unmounts
      return () => clearInterval(processingInterval);
    }, 2000);
    
    // Process the file in a single batch
    setTotalBatches(1);
    processBatch(0);
  };

  const processBatch = (batchIndex: number) => {
    processBatchMutation.mutate({ index: batchIndex });
  };

  const handleApproveWine = (wine: ProcessedWine, useAiRecommendation = false) => {
    // If we want to use AI recommendation, update the wine data
    if (useAiRecommendation && wine.aiDrinkingWindowRecommendation) {
      wine = {
        ...wine,
        mappedData: {
          ...wine.mappedData,
          drinkingWindowStart: wine.aiDrinkingWindowRecommendation.start,
          drinkingWindowEnd: wine.aiDrinkingWindowRecommendation.end,
        }
      };
    }
    
    setApprovedWines(prev => [...prev, wine]);
    setAllProcessedWines(prev => prev.filter(w => w.rowIndex !== wine.rowIndex));
  };

  const handleRejectWine = (wine: ProcessedWine) => {
    setRejectedWines(prev => [...prev, wine]);
    setAllProcessedWines(prev => prev.filter(w => w.rowIndex !== wine.rowIndex));
  };
  
  const handleEditWine = (wine: ProcessedWine) => {
    setEditingWine(wine);
    // Reset the edited data when opening the dialog
    setEditedWineData({});
    setIsEditDialogOpen(true);
  };
  
  const handleSaveEdit = (updatedWine: ProcessedWine) => {
    setAllProcessedWines(prev => 
      prev.map(w => w.rowIndex === updatedWine.rowIndex ? updatedWine : w)
    );
    setEditingWine(null);
    setIsEditDialogOpen(false);
    
    toast({
      title: "Wine updated",
      description: "The wine data has been updated. You can now approve or reject it.",
    });
  };

  const handleImport = () => {
    if (approvedWines.length === 0) {
      toast({
        title: "No wines to import",
        description: "Please approve at least one wine to import.",
        variant: "destructive",
      });
      return;
    }
    
    importWinesMutation.mutate(approvedWines);
  };

  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setProcessedBatch(null);
    setAllProcessedWines([]);
    setApprovedWines([]);
    setRejectedWines([]);
    setLoading(false);
    setIsDragOver(false);
    setCurrentBatchIndex(0);
    setTotalBatches(1);
    setImportFinished(false);
    setActiveTab('upload');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get wines with issues first
  const prioritizedWines = [...allProcessedWines].sort((a, b) => {
    // Wines missing required fields come first
    if (a.missingRequiredFields.length > 0 && b.missingRequiredFields.length === 0) return -1;
    if (a.missingRequiredFields.length === 0 && b.missingRequiredFields.length > 0) return 1;
    
    // Then wines that need verification
    if (a.needsVerification && !b.needsVerification) return -1;
    if (!a.needsVerification && b.needsVerification) return 1;
    
    // Then potential duplicates
    if (a.isPotentialDuplicate && !b.isPotentialDuplicate) return -1;
    if (!a.isPotentialDuplicate && b.isPotentialDuplicate) return 1;
    
    // Then sort by confidence (low to high)
    const confidenceOrder = { low: 0, medium: 1, high: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  // Wine edit dialog state
  const [editedWineData, setEditedWineData] = useState<Partial<ProcessedWine['mappedData']>>({});
  
  // Update edited wine data
  const handleEditFieldChange = (field: string, value: any) => {
    setEditedWineData(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle edit dialog save
  const handleEditSave = () => {
    if (!editingWine) return;
    
    const updatedWine: ProcessedWine = {
      ...editingWine,
      mappedData: {
        ...editingWine.mappedData,
        ...editedWineData
      }
    };
    
    handleSaveEdit(updatedWine);
  };
  
  return (
    <div className="container mx-auto p-4">
      {/* Edit Wine Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Wine Data</DialogTitle>
          </DialogHeader>
          
          {editingWine && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="producer">Producer</Label>
                <Input
                  id="producer"
                  defaultValue={editingWine.mappedData.producer || ''}
                  onChange={(e) => handleEditFieldChange('producer', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="name">Wine Name</Label>
                <Input
                  id="name"
                  defaultValue={editingWine.mappedData.name || ''}
                  onChange={(e) => handleEditFieldChange('name', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="vintage">Vintage</Label>
                <Input
                  id="vintage"
                  defaultValue={editingWine.mappedData.vintage?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'NV') {
                      handleEditFieldChange('vintage', 'NV');
                    } else if (value === '' || isNaN(parseInt(value))) {
                      handleEditFieldChange('vintage', undefined);
                    } else {
                      handleEditFieldChange('vintage', parseInt(value));
                    }
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Wine Type</Label>
                <Select
                  defaultValue={editingWine.mappedData.type || ''}
                  onValueChange={(value) => handleEditFieldChange('type', value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select wine type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="rose">Rosé</SelectItem>
                    <SelectItem value="sparkling">Sparkling</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="fortified">Fortified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  defaultValue={editingWine.mappedData.region || ''}
                  onChange={(e) => handleEditFieldChange('region', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="subregion">Subregion</Label>
                <Input
                  id="subregion"
                  defaultValue={editingWine.mappedData.subregion || ''}
                  onChange={(e) => handleEditFieldChange('subregion', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="vineyard">Vineyard</Label>
                <Input
                  id="vineyard"
                  defaultValue={editingWine.mappedData.vineyard || ''}
                  onChange={(e) => handleEditFieldChange('vineyard', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="grapeVarieties">Grape Varieties</Label>
                <Input
                  id="grapeVarieties"
                  defaultValue={editingWine.mappedData.grapeVarieties || ''}
                  onChange={(e) => handleEditFieldChange('grapeVarieties', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="bottleSize">Bottle Size</Label>
                <Input
                  id="bottleSize"
                  defaultValue={editingWine.mappedData.bottleSize || ''}
                  onChange={(e) => handleEditFieldChange('bottleSize', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  defaultValue={editingWine.mappedData.quantity?.toString() || '1'}
                  onChange={(e) => handleEditFieldChange('quantity', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="drinkingWindowStart">Start of Drinking Window</Label>
                <Input
                  id="drinkingWindowStart"
                  type="date"
                  defaultValue={editingWine.mappedData.drinkingWindowStart || ''}
                  onChange={(e) => handleEditFieldChange('drinkingWindowStart', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="drinkingWindowEnd">End of Drinking Window</Label>
                <Input
                  id="drinkingWindowEnd"
                  type="date"
                  defaultValue={editingWine.mappedData.drinkingWindowEnd || ''}
                  onChange={(e) => handleEditFieldChange('drinkingWindowEnd', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="storageLocation">Storage Location</Label>
                <Input
                  id="storageLocation"
                  defaultValue={editingWine.mappedData.storageLocation || 'Main Cellar'}
                  onChange={(e) => handleEditFieldChange('storageLocation', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  defaultValue={editingWine.mappedData.notes || ''}
                  onChange={(e) => handleEditFieldChange('notes', e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="upload" disabled={loading}>Upload</TabsTrigger>
          <TabsTrigger 
            value="review" 
            disabled={allProcessedWines.length === 0 && approvedWines.length === 0 && rejectedWines.length === 0}
          >
            Review & Import
          </TabsTrigger>
          <TabsTrigger value="complete" disabled={!importFinished}>Complete</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-0">
          <div className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragOver ? 'border-primary bg-primary/5' : 'border-border'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center">
                <FileSpreadsheet className="h-12 w-12 mb-4 text-muted-foreground" />
                <h3 className="font-medium text-lg mb-2">Upload a spreadsheet</h3>
                <p className="text-muted-foreground mb-4">Drag and drop your Excel or CSV file here, or click to browse</p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                />
                
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
              </div>
            </div>
            
            {file && (
              <div className="p-4 bg-card rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-8 w-8 mr-3 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFile(null)} 
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Upload Progress</Label>
                      <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={handleUpload} 
                    disabled={loading || !file}
                  >
                    {loading ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Process
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {currentBatchIndex > 0 && (
              <div className="p-4 bg-card rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Processing Batches</Label>
                    <span className="text-xs text-muted-foreground">
                      {currentBatchIndex} of {totalBatches} batches
                    </span>
                  </div>
                  <Progress value={(currentBatchIndex / totalBatches) * 100} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="review" className="mt-0">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div>
                <h3 className="text-lg font-medium mb-1">Review & Import Wines</h3>
                <p className="text-muted-foreground">
                  Review the extracted wine data and approve or reject each entry.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  disabled={loading}
                >
                  <Ban className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleImport}
                  disabled={loading || approvedWines.length === 0}
                >
                  <ArrowRight className="mr-1 h-4 w-4" />
                  Import {approvedWines.length} Wine{approvedWines.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="bg-card p-2 rounded-md flex items-center">
                <div className="bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs font-medium mr-2">
                  {prioritizedWines.length}
                </div>
                <span className="text-sm">Pending Review</span>
              </div>
              
              <div className="bg-card p-2 rounded-md flex items-center">
                <div className="bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs font-medium mr-2">
                  {approvedWines.length}
                </div>
                <span className="text-sm">Approved</span>
              </div>
              
              <div className="bg-card p-2 rounded-md flex items-center">
                <div className="bg-red-100 text-red-800 rounded-full px-2 py-1 text-xs font-medium mr-2">
                  {rejectedWines.length}
                </div>
                <span className="text-sm">Rejected</span>
              </div>
            </div>
            
            {prioritizedWines.length === 0 && approvedWines.length === 0 && rejectedWines.length === 0 ? (
              <div className="text-center p-12 border border-dashed rounded-lg">
                <p className="text-muted-foreground">No wine data to review yet. Upload a spreadsheet to get started.</p>
              </div>
            ) : (
              <>
                {prioritizedWines.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Wines Pending Review ({prioritizedWines.length})</h4>
                    <div className="space-y-4">
                      {prioritizedWines.map((wine) => (
                        <WineImportCard
                          key={wine.rowIndex}
                          wine={wine}
                          onApprove={handleApproveWine}
                          onReject={handleRejectWine}
                          onEdit={() => handleEditWine(wine)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {approvedWines.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h4 className="font-medium">Approved Wines ({approvedWines.length})</h4>
                    <div className="space-y-4">
                      {approvedWines.map((wine) => (
                        <WineImportCard
                          key={wine.rowIndex}
                          wine={wine}
                          onApprove={() => {}}
                          onReject={() => {
                            // Move wine back to pending
                            setAllProcessedWines(prev => [...prev, wine]);
                            setApprovedWines(prev => prev.filter(w => w.rowIndex !== wine.rowIndex));
                          }}
                          onEdit={() => {}}
                          editable={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {rejectedWines.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h4 className="font-medium">Rejected Wines ({rejectedWines.length})</h4>
                    <div className="space-y-4">
                      {rejectedWines.map((wine) => (
                        <WineImportCard
                          key={wine.rowIndex}
                          wine={wine}
                          onApprove={() => {
                            // Move wine to approved
                            setApprovedWines(prev => [...prev, wine]);
                            setRejectedWines(prev => prev.filter(w => w.rowIndex !== wine.rowIndex));
                          }}
                          onReject={() => {}}
                          onEdit={() => {}}
                          editable={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="complete" className="mt-0">
          <div className="space-y-6 text-center p-8">
            <div className="mx-auto bg-green-100 text-green-800 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-4">
              <Check className="h-8 w-8" />
            </div>
            
            <h3 className="text-xl font-medium">Import Complete!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {approvedWines.length} wines have been successfully added to your collection.
            </p>
            
            <div className="pt-6">
              <Button onClick={handleReset}>
                <Upload className="mr-2 h-4 w-4" />
                Import Another Spreadsheet
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpreadsheetImport;