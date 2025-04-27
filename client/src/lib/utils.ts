import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date with fallback for null/undefined
export function formatDate(date: Date | string | null | undefined, formatStr: string = "MMM d, yyyy"): string {
  if (!date) return "N/A";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

// Format price with currency symbol
export function formatPrice(price: number | null | undefined, currency: string = "$"): string {
  if (price === null || price === undefined) return "N/A";
  return `${currency}${price.toFixed(2)}`;
}

// Get wine type icon color class
export function getWineTypeColorClass(type: string): string {
  switch (type.toLowerCase()) {
    case 'red':
      return 'wine-glass-red';
    case 'white':
      return 'wine-glass-white';
    case 'rose':
    case 'rosé':
      return 'wine-glass-rose';
    case 'sparkling':
    case 'champagne':
      return 'wine-glass-sparkling';
    default:
      return 'text-gray-400';
  }
}

// Get readable name from snake_case or camelCase
export function getReadableName(name: string): string {
  // Replace underscores and hyphens with spaces
  let readable = name.replace(/[_-]/g, ' ');
  
  // Handle camelCase
  readable = readable.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Capitalize first letter of each word
  return readable
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Parse drinking window from string or date
export function parseDrinkingWindow(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  if (!start && !end) return "Not specified";
  
  const startDate = start ? formatDate(start, "yyyy") : "Now";
  const endDate = end ? formatDate(end, "yyyy") : "Unknown";
  
  return `${startDate} - ${endDate}`;
}

// Sum values in an array
export function sumArray(arr: number[]): number {
  return arr.reduce((sum, value) => sum + value, 0);
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
