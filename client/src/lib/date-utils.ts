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
 * Parse a drinking window from a wine object
 */
export function parseDrinkingWindow(wine: Wine): string {
  const start = wine.drinkingWindowStart ? new Date(wine.drinkingWindowStart) : null;
  const end = wine.drinkingWindowEnd ? new Date(wine.drinkingWindowEnd) : null;
  
  if (!start && !end) return "Not specified";
  
  // Format dates as just the year for drinking windows
  const startYear = start ? format(start, 'yyyy') : '';
  const endYear = end ? format(end, 'yyyy') : '';
  
  if (start && end) {
    return `${startYear} - ${endYear}`;
  } else if (start) {
    return `From ${startYear}`;
  } else if (end) {
    return `Until ${endYear}`;
  }
  
  return "Not specified";
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