
import { toast as sonnerToast } from "sonner";
import { useToast as useToastOriginal } from "@/hooks/use-toast";

// Re-export the original useToast
export const useToast = useToastOriginal;

// Export the sonner toast for direct use
export const toast = sonnerToast;

// Add useful aliases to match our user expectations
sonnerToast.info = sonnerToast;

// Configure default toast options
sonnerToast.success = (message) => sonnerToast(message, {
  style: { backgroundColor: 'green', color: 'white' },
  duration: 3000 
});

sonnerToast.error = (message) => sonnerToast(message, {
  style: { backgroundColor: '#ff4d4f', color: 'white' },
  duration: 4000
});

sonnerToast.warning = (message) => sonnerToast(message, {
  style: { backgroundColor: '#faad14', color: 'white' },
  duration: 4000
});
