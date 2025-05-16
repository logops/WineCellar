import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class values into a single string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a price with a dollar sign
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date string as MonthName Day, Year
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric', 
    year: 'numeric'
  }).format(date);
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Convert a string to title case
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize a wine type to a standard format
 */
export function normalizeWineType(type: string | null | undefined): string {
  if (!type) return 'Red';
  
  const normalizedType = type.toLowerCase().trim();
  
  if (normalizedType.includes('red')) return 'Red';
  if (normalizedType.includes('white')) return 'White';
  if (normalizedType.includes('rose') || normalizedType.includes('rosé')) return 'Rosé';
  if (normalizedType.includes('sparkling') || normalizedType.includes('champagne')) return 'Sparkling';
  if (normalizedType.includes('dessert') || normalizedType.includes('sweet')) return 'Dessert';
  if (normalizedType.includes('fortified') || normalizedType.includes('port')) return 'Fortified';
  
  return 'Red'; // Default to red
}

/**
 * Generate a display name for a wine
 */
export function getWineDisplayName(wine: any): string {
  const parts = [];
  
  if (wine.vintage) parts.push(wine.vintage);
  if (wine.producer) parts.push(wine.producer);
  if (wine.name) parts.push(wine.name);
  
  return parts.join(' ');
}

/**
 * Get a CSS color class based on wine type
 */
export function getWineTypeColorClass(type: string | null | undefined): string {
  if (!type) return 'text-red-800';
  
  const normalizedType = type.toLowerCase().trim();
  
  if (normalizedType.includes('red')) return 'text-red-800';
  if (normalizedType.includes('white')) return 'text-amber-600';
  if (normalizedType.includes('rose') || normalizedType.includes('rosé')) return 'text-pink-500';
  if (normalizedType.includes('sparkling') || normalizedType.includes('champagne')) return 'text-yellow-500';
  if (normalizedType.includes('dessert') || normalizedType.includes('sweet')) return 'text-amber-900';
  if (normalizedType.includes('fortified') || normalizedType.includes('port')) return 'text-purple-900';
  
  return 'text-red-800'; // Default to red
}