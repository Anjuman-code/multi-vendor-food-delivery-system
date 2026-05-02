import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  deactivateAccountSchema,
  type DeactivateAccountFormData,
} from "@/lib/validation";
import { useAuth } from "@/contexts/AuthContext";
import userService from "@/services/userService";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

export interface DeactivateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeactivated: () => void;
}

export const DeactivateAccountDialog: React.FC<DeactivateAccountDialogProps> = ({
  open,
  onOpenChange,
  onDeactivated,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const { logout: logoutContext } = useAuth();

  const form = useForm<DeactivateAccountFormData>({
    resolver: zodResolver(deactivateAccountSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (data: DeactivateAccountFormData) => {
    setIsSaving(true);
    const res = await userService.deactivateAccount(data.password);
    if (res.success) {
      toast({
        title: "Account Deactivated",
        description: "Your account has been deactivated.",
      });
      logoutContext();
      onOpenChange(false);
      onDeactivated();
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Deactivate Account</DialogTitle>
          <DialogDescription>
            This action will deactivate your account. Enter your password to
            confirm.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      className="rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Deactivate
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};