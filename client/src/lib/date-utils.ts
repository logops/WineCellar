import { Wine } from "@shared/schema";
import { format } from "date-fns";

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateYMD(date: Date | null): string {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format a drinking window string
 */
export function formatDrinkingWindow(startDate: Date | null, endDate: Date | null): string {
  if (!startDate && !endDate) return "Not specified";
  
  // Format dates as just the year for drinking windows
  const startYear = startDate ? format(startDate, 'yyyy') : '';
  const endYear = endDate ? format(endDate, 'yyyy') : '';
  
  if (startDate && endDate) {
    return `${startYear} - ${endYear}`;
  } else if (startDate) {
    return `From ${startYear}`;
  } else if (endDate) {
    return `Until ${endYear}`;
  }
  
  return "Not specified";
}

/**
 * Parse a drinking window from a wine object
 */
export function parseDrinkingWindow(wine: Wine): string {
  const start = wine.drinkingWindowStart ? new Date(wine.drinkingWindowStart) : null;
  const end = wine.drinkingWindowEnd ? new Date(wine.drinkingWindowEnd) : null;
  return formatDrinkingWindow(start, end);
}

/**
 * Determine if a wine is ready to drink based on its drinking window
 */
export function isReadyToDrink(wine: Wine): boolean {
  if (wine.drinkingStatus === 'drink_now') return true;
  
  if (wine.drinkingWindowStart) {
    const start = new Date(wine.drinkingWindowStart);
    const now = new Date();
    return start <= now;
  }
  
  return false;
}