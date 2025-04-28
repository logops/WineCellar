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
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { formatDate, formatPrice } from '@/lib/utils';
import { Download, Settings } from 'lucide-react';

interface SpreadsheetViewProps {
  wines: Wine[];
  onWineUpdate: (id: number, data: Partial<Wine>) => void;
}

export default function SpreadsheetView({ wines, onWineUpdate }: SpreadsheetViewProps) {
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

  // Sorting function
  const sortedWines = useMemo(() => {
    let sortableWines = [...wines];
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
  }, [wines, sortConfig]);

  // Handle column sort
  const requestSort = (key: keyof Wine) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Export to CSV function
  const exportToCSV = () => {
    // Get visible columns
    const visibleColumns = Object.entries(columnVisibility)
      .filter(([_, isVisible]) => isVisible)
      .map(([column]) => column);
    
    // Create CSV header
    const header = visibleColumns.map(col => `"${col}"`).join(',');
    
    // Create CSV rows
    const rows = sortedWines.map(wine => {
      return visibleColumns.map(col => {
        const value = wine[col as keyof Wine];
        // Handle special formatting for dates and prices
        if (col === 'purchaseDate' && value) {
          return `"${formatDate(value as string)}"`;
        }
        if ((col === 'purchasePrice' || col === 'currentValue') && value !== null) {
          return `"${formatPrice(value as number)}"`;
        }
        // Handle other fields
        return `"${value || ''}"`;
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

  // Handle cell click for editing
  const handleCellClick = (id: number, field: keyof Wine) => {
    // Only allow editing certain fields
    const editableFields = [
      'notes', 'currentValue', 'quantity', 'purchasePrice', 
      'type', 'region', 'subregion', 'grapeVarieties'
    ];
    
    if (editableFields.includes(field as string)) {
      const wine = wines.find(w => w.id === id);
      if (wine) {
        setEditingCell({ id, field });
        setEditValue(wine[field] !== null ? String(wine[field]) : '');
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
    { key: 'producer' as keyof Wine, label: 'Producer' },
    { key: 'vintage' as keyof Wine, label: 'Vintage' },
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
      case 'drinkingStatus':
        if (wine.drinkingWindowStart && wine.drinkingWindowEnd) {
          const start = typeof wine.drinkingWindowStart === 'string' 
            ? wine.drinkingWindowStart 
            : formatDate(wine.drinkingWindowStart);
          const end = typeof wine.drinkingWindowEnd === 'string'
            ? wine.drinkingWindowEnd
            : formatDate(wine.drinkingWindowEnd);
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

  return (
    <div className="w-full overflow-hidden border border-cream-200 rounded-xl">
      <div className="p-4 flex justify-between items-center bg-cream-50 border-b border-cream-200">
        <h2 className="text-lg font-semibold text-burgundy-800">Wine Collection Spreadsheet</h2>
        <div className="flex gap-2">
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
                columnVisibility[column.key] && (
                  <TableHead 
                    key={column.key}
                    className={getHeaderClass(column.key)}
                    onClick={() => requestSort(column.key)}
                  >
                    {column.label}{getSortIndicator(column.key)}
                  </TableHead>
                )
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