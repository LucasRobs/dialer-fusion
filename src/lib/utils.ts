
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number to ensure it's in the correct format (e.g., 85997484924)
 * Removes any non-digit characters and the Brazil country code (+55)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove Brazil country code if present (55)
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // Handle case where phone might start with +55
  if (cleaned.length > 10) {
    return cleaned.slice(-11); // Keep last 11 digits (area code + number)
  }
  
  return cleaned;
}

/**
 * Validates if a phone number is in the correct Brazilian format
 * Must have 10 or 11 digits (with or without the 9 prefix)
 */
export function isValidBrazilianPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneNumber(phone);
  // Valid Brazilian numbers have 10 or 11 digits (with area code)
  return /^[1-9]\d{8,9}$/.test(cleaned);
}
