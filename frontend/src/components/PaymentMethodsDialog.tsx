import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { PaymentMethod } from "@/services/userService";
import userService from "@/services/userService";
import { Loader2, Save, Trash2 } from "lucide-react";
import { CreditCard } from "lucide-react";

export interface PaymentMethodsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethods: PaymentMethod[];
  isLoadingPayments: boolean;
}

export const PaymentMethodsDialog: React.FC<PaymentMethodsDialogProps> = ({
  isOpen,
  onOpenChange,
  paymentMethods,
  isLoadingPayments,
}) => {
  const { toast } = useToast();
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"card" | "upi" | "wallet">("card");
  const [newPaymentProvider, setNewPaymentProvider] = useState("");
  const [newPaymentAccountRef, setNewPaymentAccountRef] = useState("");
  const [newPaymentExpiryMonth, setNewPaymentExpiryMonth] = useState("");
  const [newPaymentExpiryYear, setNewPaymentExpiryYear] = useState("");
  const [newPaymentDefault, setNewPaymentDefault] = useState(false);

  const resetPaymentForm = useCallback(() => {
    setNewPaymentType("card");
    setNewPaymentProvider("");
    setNewPaymentAccountRef("");
    setNewPaymentExpiryMonth("");
    setNewPaymentExpiryYear("");
    setNewPaymentDefault(false);
  }, []);

  const handleAddPaymentMethod = useCallback(async () => {
    const provider = newPaymentProvider.trim();
    const accountRefDigits = newPaymentAccountRef.replace(/\D/g, "");

    if (!provider) {
      toast({
        title: "Provider required",
        description:
          "Enter a payment provider (for example Visa, bKash, Nagad).",
        variant: "destructive",
      });
      return;
    }

    if (accountRefDigits.length < 4) {
      toast({
        title: "Invalid account reference",
        description:
          "Enter at least 4 digits so we can store the last 4 securely.",
        variant: "destructive",
      });
      return;
    }

    const payload: {
      type: "card" | "upi" | "wallet";
      provider: string;
      token: string;
      last4: string;
      isDefault?: boolean;
      expiryMonth?: number;
      expiryYear?: number;
    } = {
      type: newPaymentType,
      provider,
      token: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      last4: accountRefDigits.slice(-4),
      isDefault: newPaymentDefault,
    };

    if (newPaymentType === "card") {
      const monthNum = Number(newPaymentExpiryMonth);
      const yearNum = Number(newPaymentExpiryYear);
      if (
        !Number.isInteger(monthNum) ||
        monthNum < 1 ||
        monthNum > 12 ||
        !Number.isInteger(yearNum) ||
        yearNum < 2024 ||
        yearNum > 2050
      ) {
        toast({
          title: "Invalid expiry",
          description: "Enter a valid card expiry month and year.",
          variant: "destructive",
        });
        return;
      }
      payload.expiryMonth = monthNum;
      payload.expiryYear = yearNum;
    }

    setIsAddingPayment(true);
    const res = await userService.addPaymentMethod(payload);
    if (res.success && res.data?.paymentMethod) {
      toast({ title: "Payment method added" });
      onOpenChange(false);
      resetPaymentForm();
    } else {
      toast({
        title: "Add payment failed",
        description: res.message || "Could not add payment method.",
        variant: "destructive",
      });
    }
    setIsAddingPayment(false);
  }, [
    newPaymentProvider,
    newPaymentAccountRef,
    newPaymentType,
    newPaymentDefault,
    newPaymentExpiryMonth,
    newPaymentExpiryYear,
    resetPaymentForm,
    toast,
    onOpenChange,
  ]);

  const handleSetDefaultPayment = useCallback(
    async (methodId: string) => {
      setIsUpdatingPayment(true);
      const res = await userService.updatePaymentMethod(methodId, {
        isDefault: true,
      });
      if (res.success) {
        toast({ title: "Default payment updated" });
      } else {
        toast({
          title: "Update failed",
          description:
            res.message || "Could not update default payment method.",
          variant: "destructive",
        });
      }
      setIsUpdatingPayment(false);
    },
    [toast],
  );

  const handleDeletePaymentMethod = useCallback(
    async (methodId: string) => {
      const shouldDelete = window.confirm(
        "Remove this payment method from your account?",
      );
      if (!shouldDelete) return;

      setIsUpdatingPayment(true);
      const res = await userService.deletePaymentMethod(methodId);
      if (res.success) {
        toast({ title: "Payment method removed" });
      } else {
        toast({
          title: "Remove failed",
          description: res.message || "Could not remove payment method.",
          variant: "destructive",
        });
      }
      setIsUpdatingPayment(false);
    },
    [toast],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Save a payment method for faster checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select
              value={newPaymentType}
              onValueChange={(value: "card" | "upi" | "wallet") =>
                setNewPaymentType(value)
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Provider</Label>
            <Input
              value={newPaymentProvider}
              onChange={(e) => setNewPaymentProvider(e.target.value)}
              placeholder={
                newPaymentType === "card"
                  ? "Visa / Mastercard"
                  : newPaymentType === "upi"
                    ? "bKash / Nagad"
                    : "Wallet provider"
              }
              className="rounded-xl"
            />
          </div>

          <div>
            <Label>
              {newPaymentType === "card"
                ? "Card Number"
                : "Account / Phone / UPI Reference"}
            </Label>
            <Input
              value={newPaymentAccountRef}
              onChange={(e) => setNewPaymentAccountRef(e.target.value)}
              placeholder={
                newPaymentType === "card"
                  ? "4111 1111 1111 1111"
                  : "Enter reference with digits"
              }
              className="rounded-xl"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only the last 4 digits are stored in your profile display.
            </p>
          </div>

          {newPaymentType === "card" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expiry Month</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={newPaymentExpiryMonth}
                  onChange={(e) => setNewPaymentExpiryMonth(e.target.value)}
                  placeholder="MM"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Expiry Year</Label>
                <Input
                  type="number"
                  min={2024}
                  max={2050}
                  value={newPaymentExpiryYear}
                  onChange={(e) => setNewPaymentExpiryYear(e.target.value)}
                  placeholder="YYYY"
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Set as default
              </p>
              <p className="text-xs text-gray-500">
                Use this payment method first at checkout.
              </p>
            </div>
            <Switch
              checked={newPaymentDefault}
              onCheckedChange={setNewPaymentDefault}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetPaymentForm();
            }}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddPaymentMethod}
            disabled={isAddingPayment}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            {isAddingPayment ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Payment Method
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
  isLoadingPayments: boolean;
  onRefresh: () => Promise<void>;
}

export const PaymentMethodsList: React.FC<PaymentMethodsListProps> = ({
  paymentMethods,
  isLoadingPayments,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const handleSetDefaultPayment = useCallback(
    async (methodId: string) => {
      setIsUpdatingPayment(true);
      const res = await userService.updatePaymentMethod(methodId, {
        isDefault: true,
      });
      if (res.success && res.data?.paymentMethod) {
        toast({ title: "Default payment updated" });
        await onRefresh();
      } else {
        toast({
          title: "Update failed",
          description:
            res.message || "Could not update default payment method.",
          variant: "destructive",
        });
      }
      setIsUpdatingPayment(false);
    },
    [toast, onRefresh],
  );

  const handleDeletePaymentMethod = useCallback(
    async (methodId: string) => {
      const shouldDelete = window.confirm(
        "Remove this payment method from your account?",
      );
      if (!shouldDelete) return;

      setIsUpdatingPayment(true);
      const res = await userService.deletePaymentMethod(methodId);
      if (res.success) {
        toast({ title: "Payment method removed" });
        await onRefresh();
      } else {
        toast({
          title: "Remove failed",
          description: res.message || "Could not remove payment method.",
          variant: "destructive",
        });
      }
      setIsUpdatingPayment(false);
    },
    [toast, onRefresh],
  );

  return (
    <div className="space-y-3">
      {paymentMethods.map((pm) => (
        <div
          key={pm._id}
          className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 capitalize">
                {pm.type} · {pm.provider}
                {pm.isDefault && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-600">
                ****{pm.last4}
                {pm.expiryMonth && pm.expiryYear
                  ? ` · Exp ${String(pm.expiryMonth).padStart(2, "0")}/${pm.expiryYear}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!pm.isDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdatingPayment}
                onClick={() => handleSetDefaultPayment(pm._id)}
                className="rounded-lg"
              >
                Set Default
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUpdatingPayment}
              onClick={() => handleDeletePaymentMethod(pm._id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};