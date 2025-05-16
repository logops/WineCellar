import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface WineListHeaderProps {
  title: string;
  count: number;
  totalWines: number;
  onSortChange: (value: string) => void;
  onSearchClick: () => void;
}

export default function WineListHeader({
  title,
  count,
  totalWines,
  onSortChange,
  onSearchClick
}: WineListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <div>
        <h2 className="text-xl font-montserrat font-semibold text-burgundy-700">{title}</h2>
        <p className="text-gray-600 text-sm">({count} bottles of {totalWines} wines)</p>
      </div>
      
      <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
        <Select onValueChange={onSortChange} defaultValue="default">
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Recently Added</SelectItem>
            <SelectItem value="name-asc">Name: A-Z</SelectItem>
            <SelectItem value="name-desc">Name: Z-A</SelectItem>
            <SelectItem value="vintage-asc">Vintage: Oldest First</SelectItem>
            <SelectItem value="vintage-desc">Vintage: Newest First</SelectItem>
            <SelectItem value="value-desc">Value: High to Low</SelectItem>
            <SelectItem value="value-asc">Value: Low to High</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onSearchClick}
          className="h-10 w-10"
        >
          <Search className="h-5 w-5 text-gray-600" />
          <span className="sr-only">Search</span>
        </Button>
      </div>
    </div>
  );
}
