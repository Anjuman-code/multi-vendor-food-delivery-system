import * as React from "react";
import { useToast } from "@/hooks/use-toast";

export function useCustomToast() {
  const { toast } = useToast();
  
  const showToast = React.useCallback((title: string, description?: string, variant: "default" | "destructive" = "default") => {
    toast({
      title,
      description,
      variant,
    });
  }, [toast]);

  return {
    toast: showToast,
    toastSuccess: (description: string) => showToast("Success", description, "default"),
    toastError: (description: string) => showToast("Error", description, "destructive"),
  };
}