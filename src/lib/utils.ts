
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
  // Garantir que temos uma string
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove Brazil country code if present (55)
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // Handle case where phone might start with +55
  if (cleaned.length > 11) {
    return cleaned.slice(-11); // Keep last 11 digits (area code + number)
  }
  
  console.log(`Telefone formatado: "${phone}" => "${cleaned}"`);
  return cleaned;
}

/**
 * Validates if a phone number is in the correct Brazilian format
 * Must have 10 or 11 digits (with or without the 9 prefix)
 */
export function isValidBrazilianPhoneNumber(phone: string): boolean {
  const cleaned = formatPhoneNumber(phone);
  
  // Valid Brazilian numbers have exactly 10 or 11 digits (with area code)
  // O número deve ter entre 10 e 11 dígitos para ser válido
  const isValid = cleaned.length >= 10 && cleaned.length <= 11;
  
  console.log(`Validação de telefone: "${phone}" => ${isValid ? 'válido' : 'inválido'} (${cleaned})`);
  return isValid;
}
