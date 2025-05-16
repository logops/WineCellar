import { useState, useMemo } from 'react';
import { Wine } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { formatDate, formatPrice } from '@/lib/utils';
import { 
  Download, 
  Settings, 
  ArrowDownAZ, 
  ArrowUpZA, 
  Filter,
  FilterX
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SpreadsheetViewProps {
  wines: Wine[];
  onWineUpdate: (id: number, data: Partial<Wine>) => void;
  onWineClick?: (id: number) => void;
}

// Define filter types
interface TextFilter {
  type: 'text';
  value: string;
}

interface ChoiceFilter {
  type: 'choice';
  selected: string[];
}

interface NumberRangeFilter {
  type: 'number_range';
  min: number | null;
  max: number | null;
}

interface DateRangeFilter {
  type: 'date_range';
  start: Date | null;
  end: Date | null;
}

type FilterValue = TextFilter | ChoiceFilter | NumberRangeFilter | DateRangeFilter;
type Filters = {[key in keyof Wine]?: FilterValue};

export default function SpreadsheetView({ wines, onWineUpdate, onWineClick }: SpreadsheetViewProps) {
  // State for column visibility
  const [columnVisibility, setColumnVisibility] = useState<{[key: string]: boolean}>({
    producer: true,
    vintage: true,
    name: true,
    vineyard: true,
    region: true,
    subregion: true,
    type: true,
    grapeVarieties: true,
    purchaseDate: true,
    purchasePrice: true,
    currentValue: true,
    drinkingWindowStart: true,
    drinkingWindowEnd: true,
    drinkingStatus: true,
    quantity: true,
    notes: true,
  });

  // State for sorting
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Wine | null,
    direction: 'ascending' | 'descending'
  }>({
    key: null,
    direction: 'ascending'
  });

  // State for filters
  const [filters, setFilters] = useState<Filters>({});
  
  // State for filter menus
  const [openFilterMenu, setOpenFilterMenu] = useState<keyof Wine | null>(null);

  // State for editing cells
  const [editingCell, setEditingCell] = useState<{
    id: number | null,
    field: keyof Wine | null
  }>({
    id: null,
    field: null
  });

  // State for edited values
  const [editValue, setEditValue] = useState<string>('');
  
  // Track filter text inputs
  const [filterInputs, setFilterInputs] = useState<{[key: string]: string}>({});

  // Get unique values for a column
  const getUniqueValues = (key: keyof Wine) => {
    const values = wines
      .map(wine => wine[key])
      .filter(value => value !== null && value !== undefined)
      .map(value => String(value));
    
    // Use array method to ensure uniqueness instead of Set
    const uniqueValues: string[] = [];
    values.forEach(value => {
      if (!uniqueValues.includes(value)) {
        uniqueValues.push(value);
      }
    });
    
    return uniqueValues.sort();
  };

  // Apply filters to wines
  const filteredWines = useMemo(() => {
    return wines.filter(wine => {
      // Check if the wine passes all filters
      return Object.entries(filters).every(([key, filter]) => {
        const value = wine[key as keyof Wine];
        
        // Skip null values
        if (value === null || value === undefined) {
          return true;
        }
        
        switch (filter.type) {
          case 'text':
            return String(value).toLowerCase().includes(filter.value.toLowerCase());
          
          case 'choice':
            return filter.selected.length === 0 || filter.selected.includes(String(value));
          
          case 'number_range':
            const numValue = Number(value);
            const passesMin = filter.min === null || numValue >= filter.min;
            const passesMax = filter.max === null || numValue <= filter.max;
            return passesMin && passesMax;
          
          case 'date_range':
            const dateValue = new Date(String(value));
            const passesStart = filter.start === null || dateValue >= filter.start;
            const passesEnd = filter.end === null || dateValue <= filter.end;
            return passesStart && passesEnd;
            
          default:
            return true;
        }
      });
    });
  }, [wines, filters]);

  // Sorting function
  const sortedWines = useMemo(() => {
    let sortableWines = [...filteredWines];
    if (sortConfig.key !== null) {
      sortableWines.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Wine];
        const bValue = b[sortConfig.key as keyof Wine];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Convert to string for comparison
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        
        if (aString < bString) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aString > bString) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableWines;
  }, [filteredWines, sortConfig]);

  // Handle column sort
  const requestSort = (key: keyof Wine) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Filter Management Functions
  const addTextFilter = (column: keyof Wine, value: string) => {
    if (!value.trim()) {
      removeFilter(column);
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [column]: { type: 'text', value }
    }));
  };
  
  const addChoiceFilter = (column: keyof Wine, value: string, isSelected: boolean) => {
    const currentFilter = filters[column] as ChoiceFilter | undefined;
    const selected = currentFilter?.selected || [];
    
    let newSelected: string[];
    if (isSelected) {
      newSelected = [...selected, value];
    } else {
      newSelected = selected.filter(v => v !== value);
    }
    
    if (newSelected.length === 0) {
      removeFilter(column);
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [column]: { type: 'choice', selected: newSelected }
    }));
  };
  
  const addNumberRangeFilter = (column: keyof Wine, min: number | null, max: number | null) => {
    if (min === null && max === null) {
      removeFilter(column);
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [column]: { type: 'number_range', min, max }
    }));
  };
  
  const addDateRangeFilter = (column: keyof Wine, start: Date | null, end: Date | null) => {
    if (start === null && end === null) {
      removeFilter(column);
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [column]: { type: 'date_range', start, end }
    }));
  };
  
  const removeFilter = (column: keyof Wine) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
    
    // Clear any filter input text
    setFilterInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[column as string];
      return newInputs;
    });
  };
  
  const clearAllFilters = () => {
    setFilters({});
    setFilterInputs({});
  };
  
  // Determine if a column has an active filter
  const hasFilter = (column: keyof Wine) => {
    return column in filters;
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Get visible columns from the table view
    const visibleColumns = columns
      .filter(column => columnVisibility[column.key])
      .map(column => ({
        key: column.key,
        label: column.label
      }));
    
    // Create CSV header
    const header = visibleColumns.map(col => `"${col.label}"`).join(',');
    
    // Create CSV rows (in the same order as they appear in the table)
    const rows = sortedWines.map(wine => {
      return visibleColumns.map(col => {
        const value = renderCell(wine, col.key);
        // Format the value for CSV, removing any HTML tags if present
        let csvValue = typeof value === 'string' ? value : String(value || '');
        // If it's a React element, just use the raw value from wine
        if (typeof value !== 'string') {
          csvValue = wine[col.key] ? String(wine[col.key]) : '';
        }
        // For drinkingStatus, handle the special case
        if (col.key === 'drinkingStatus') {
          if (wine.drinkingWindowStart && wine.drinkingWindowEnd) {
            const start = new Date(wine.drinkingWindowStart).getFullYear();
            const end = new Date(wine.drinkingWindowEnd).getFullYear();
            csvValue = `${start} - ${end}`;
          } else if (wine.drinkingStatus) {
            csvValue = wine.drinkingStatus === 'drink_now' ? 'Drink Now' : 'Drink Later';
          }
        }
        
        // Remove any hyphen placeholders and wrap in quotes
        return `"${csvValue === '-' ? '' : csvValue}"`;
      }).join(',');
    }).join('\\n');
    
    // Combine header and rows
    const csv = `${header}\\n${rows}`;
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wine_collection.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle cell click for editing or viewing detail
  const handleCellClick = (id: number, field: keyof Wine) => {
    // Only allow editing certain fields (excluding notes)
    const editableFields = [
      'currentValue', 'quantity', 'purchasePrice', 
      'type', 'region', 'subregion', 'grapeVarieties'
    ];
    
    if (editableFields.includes(field as string)) {
      const wine = wines.find(w => w.id === id);
      if (wine) {
        setEditingCell({ id, field });
        setEditValue(wine[field] !== null ? String(wine[field]) : '');
      }
    } else {
      // If it's not an editable field, open the wine detail
      if (onWineClick) {
        onWineClick(id);
      }
    }
  };

  // Handle save edited cell
  const handleSaveEdit = () => {
    if (editingCell.id !== null && editingCell.field !== null) {
      let value: any = editValue;
      
      // Convert to number for numeric fields
      if (['currentValue', 'purchasePrice', 'quantity', 'vintage'].includes(editingCell.field as string)) {
        value = Number(editValue) || null;
      }
      
      onWineUpdate(editingCell.id, {
        [editingCell.field]: value
      });
      
      setEditingCell({ id: null, field: null });
      setEditValue('');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingCell({ id: null, field: null });
    setEditValue('');
  };

  // Get column header class based on sort state
  const getHeaderClass = (key: keyof Wine) => {
    let baseClass = "text-left cursor-pointer hover:text-burgundy-700 transition-colors";
    if (sortConfig.key === key) {
      return `${baseClass} text-burgundy-800 font-semibold`;
    }
    return baseClass;
  };

  // Get sort indicator
  const getSortIndicator = (key: keyof Wine) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
    }
    return '';
  };

  // Column definitions for type safety and reusability
  const columns = [
    { key: 'vintage' as keyof Wine, label: 'Vintage' },
    { key: 'producer' as keyof Wine, label: 'Producer' },
    { key: 'name' as keyof Wine, label: 'Name' },
    { key: 'vineyard' as keyof Wine, label: 'Vineyard' },
    { key: 'region' as keyof Wine, label: 'Region' },
    { key: 'subregion' as keyof Wine, label: 'Subregion' },
    { key: 'type' as keyof Wine, label: 'Type' },
    { key: 'grapeVarieties' as keyof Wine, label: 'Grapes' },
    { key: 'purchaseDate' as keyof Wine, label: 'Purchase Date' },
    { key: 'purchasePrice' as keyof Wine, label: 'Purchase Price' },
    { key: 'currentValue' as keyof Wine, label: 'Current Value' },
    // Special non-field column for drinking window display
    { key: 'drinkingStatus' as keyof Wine, label: 'Drinking Window' },
    { key: 'quantity' as keyof Wine, label: 'Quantity' },
    { key: 'notes' as keyof Wine, label: 'Notes' },
  ];

  // Cell renderer helper function
  const renderCell = (wine: Wine, column: keyof Wine) => {
    if (editingCell.id === wine.id && editingCell.field === column) {
      return (
        <div className="flex items-center">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 py-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') handleCancelEdit();
            }}
            onBlur={handleSaveEdit}
          />
        </div>
      );
    }

    // Regular cell rendering
    switch (column) {
      case 'purchaseDate':
        return wine.purchaseDate ? formatDate(wine.purchaseDate) : '-';
      case 'purchasePrice':
        return wine.purchasePrice !== null ? formatPrice(wine.purchasePrice) : '-';
      case 'currentValue':
        return wine.currentValue !== null ? formatPrice(wine.currentValue) : '-';
      case 'notes':
        return wine.notes ? 
          (wine.notes.length > 50 ? `${wine.notes.substring(0, 50)}...` : wine.notes) : 
          '-';
      case 'name':
        if (wine.name) {
          return wine.name;
        } else if (wine.grapeVarieties) {
          return wine.grapeVarieties.split(',')[0].trim();
        }
        return '-';
      case 'drinkingStatus':
        if (wine.drinkingWindowStart && wine.drinkingWindowEnd) {
          const start = typeof wine.drinkingWindowStart === 'string' 
            ? new Date(wine.drinkingWindowStart).getFullYear()
            : new Date(wine.drinkingWindowStart).getFullYear();
          const end = typeof wine.drinkingWindowEnd === 'string'
            ? new Date(wine.drinkingWindowEnd).getFullYear()
            : new Date(wine.drinkingWindowEnd).getFullYear();
          return `${start} - ${end}`;
        } else if (wine.drinkingStatus) {
          return wine.drinkingStatus === 'drink_now' ? 'Drink Now' : 'Drink Later';
        }
        return '-';
      default:
        return wine[column] !== null && wine[column] !== undefined 
          ? String(wine[column]) 
          : '-';
    }
  };

  // Column header with simple filtering
  const renderColumnHeader = (column: {key: keyof Wine, label: string}) => {
    const columnKey = column.key;
    const isFiltered = hasFilter(columnKey);
    
    return (
      <TableHead 
        key={columnKey}
        className={getHeaderClass(columnKey)}
      >
        <div className="flex items-center gap-1">
          <span 
            className="cursor-pointer" 
            onClick={() => requestSort(columnKey)}
          >
            {column.label}
            {getSortIndicator(columnKey)}
          </span>
          
          {isFiltered && (
            <Badge variant="outline" className="h-5 bg-burgundy-50 text-burgundy-800 ml-1">
              <Filter className="w-3 h-3 mr-1" />
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-500 hover:text-burgundy-700"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem 
                onClick={() => setSortConfig({key: columnKey, direction: 'ascending'})}
              >
                <ArrowDownAZ className="w-4 h-4 mr-2" />
                <span>Sort A to Z</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setSortConfig({key: columnKey, direction: 'descending'})}
              >
                <ArrowUpZA className="w-4 h-4 mr-2" />
                <span>Sort Z to A</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Text search filter for text columns */}
              {['producer', 'name', 'vineyard', 'region', 'subregion', 'type', 'grapeVarieties'].includes(String(columnKey)) && (
                <div className="p-2">
                  <Input
                    placeholder={`Filter by ${column.label}...`}
                    value={filterInputs[String(columnKey)] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilterInputs(prev => ({...prev, [columnKey]: value}));
                      if (value.trim()) {
                        addTextFilter(columnKey, value);
                      } else {
                        removeFilter(columnKey);
                      }
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              
              {/* Number range filter for numeric columns */}
              {['vintage', 'purchasePrice', 'currentValue', 'quantity'].includes(String(columnKey)) && (
                <div className="p-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={(filters[columnKey] as NumberRangeFilter)?.min ?? ''}
                        onChange={(e) => {
                          const min = e.target.value ? Number(e.target.value) : null;
                          const max = (filters[columnKey] as NumberRangeFilter)?.max ?? null;
                          addNumberRangeFilter(columnKey, min, max);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={(filters[columnKey] as NumberRangeFilter)?.max ?? ''}
                        onChange={(e) => {
                          const max = e.target.value ? Number(e.target.value) : null;
                          const min = (filters[columnKey] as NumberRangeFilter)?.min ?? null;
                          addNumberRangeFilter(columnKey, min, max);
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {isFiltered && (
                <DropdownMenuItem
                  onClick={() => removeFilter(columnKey)}
                  className="text-red-600"
                >
                  <FilterX className="w-4 h-4 mr-2" />
                  <span>Clear filter</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableHead>
    );
  };

  return (
    <div className="w-full overflow-hidden border border-cream-200 rounded-xl">
      <div className="p-4 flex justify-between items-center bg-cream-50 border-b border-cream-200">
        <h2 className="text-lg font-semibold text-burgundy-800">Wine Collection Spreadsheet</h2>
        <div className="flex gap-2">
          {Object.keys(filters).length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1 text-burgundy-700"
              onClick={clearAllFilters}
            >
              <FilterX size={16} />
              <span>Clear Filters</span>
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Settings size={16} />
                <span>Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={columnVisibility[column.key]}
                  onCheckedChange={(checked) => {
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [column.key]: checked
                    }));
                  }}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
            onClick={exportToCSV}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>
      
      <div className="overflow-auto max-h-[70vh]">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => 
                columnVisibility[column.key] && renderColumnHeader(column)
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedWines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Object.values(columnVisibility).filter(Boolean).length}
                  className="h-24 text-center"
                >
                  No wines found
                </TableCell>
              </TableRow>
            ) : (
              sortedWines.map((wine) => (
                <TableRow key={wine.id}>
                  {columns.map((column) => 
                    columnVisibility[column.key] && (
                      <TableCell 
                        key={`${wine.id}-${column.key}`}
                        className="py-2 cursor-pointer hover:bg-cream-50"
                        onClick={() => handleCellClick(wine.id, column.key)}
                      >
                        {renderCell(wine, column.key)}
                      </TableCell>
                    )
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}