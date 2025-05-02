
import { toast as sonnerToast } from "sonner";
import { useToast as useToastOriginal } from "@/hooks/use-toast";

// Re-export the original useToast
export const useToast = useToastOriginal;

// Export the sonner toast for direct use
export const toast = sonnerToast;
