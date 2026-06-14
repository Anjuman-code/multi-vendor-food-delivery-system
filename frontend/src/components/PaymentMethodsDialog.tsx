import { useCallback, useState } from "react";

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
import { useConfirm } from "@/contexts/ConfirmContext";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/formErrors";
import type { PaymentMethod } from "@/services/userService";
import userService from "@/services/userService";
import { CreditCard, Loader2, Save, Trash2 } from "lucide-react";

export interface PaymentMethodsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethods: PaymentMethod[];
  isLoadingPayments: boolean;
}

export const PaymentMethodsDialog: React.FC<PaymentMethodsDialogProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"card" | "upi" | "wallet">("card");
  const [newPaymentProvider, setNewPaymentProvider] = useState("");
  const [newPaymentAccountRef, setNewPaymentAccountRef] = useState("");
  const [newPaymentExpiryMonth, setNewPaymentExpiryMonth] = useState("");
  const [newPaymentExpiryYear, setNewPaymentExpiryYear] = useState("");
  const [newPaymentDefault, setNewPaymentDefault] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    provider?: string;
    accountRef?: string;
    expiry?: string;
  }>({});

  const resetPaymentForm = useCallback(() => {
    setNewPaymentType("card");
    setNewPaymentProvider("");
    setNewPaymentAccountRef("");
    setNewPaymentExpiryMonth("");
    setNewPaymentExpiryYear("");
    setNewPaymentDefault(false);
    setFieldErrors({});
  }, []);

  const handleAddPaymentMethod = useCallback(async () => {
    const provider = newPaymentProvider.trim();
    const accountRefDigits = newPaymentAccountRef.replace(/\D/g, "");

    setFieldErrors({});

    if (!provider) {
      setFieldErrors({
        provider: "Enter a payment provider (for example Visa, bKash, Nagad).",
      });
      toast.error("Provider required", {
        description:
          "Enter a payment provider (for example Visa, bKash, Nagad).",
      });
      return;
    }

    if (accountRefDigits.length < 4) {
      setFieldErrors({
        accountRef:
          "Enter at least 4 digits so we can store the last 4 securely.",
      });
      toast.error("Invalid account reference", {
        description:
          "Enter at least 4 digits so we can store the last 4 securely.",
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
        setFieldErrors({
          expiry: "Enter a valid card expiry month and year.",
        });
        toast.error("Invalid expiry", {
          description: "Enter a valid card expiry month and year.",
        });
        return;
      }
      payload.expiryMonth = monthNum;
      payload.expiryYear = yearNum;
    }

    setIsAddingPayment(true);
    const res = await userService.addPaymentMethod(payload);
    if (res.success && res.data?.paymentMethod) {
      toast.success("Payment method added");
      onOpenChange(false);
      resetPaymentForm();
    } else {
      toast.error(getErrorMessage(res, "Could not add payment method."));
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
    onOpenChange,
  ]);

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
              onChange={(e) => {
                setNewPaymentProvider(e.target.value);
                if (fieldErrors.provider)
                  setFieldErrors((p) => ({ ...p, provider: undefined }));
              }}
              aria-invalid={fieldErrors.provider ? true : undefined}
              placeholder={
                newPaymentType === "card"
                  ? "Visa / Mastercard"
                  : newPaymentType === "upi"
                    ? "bKash / Nagad"
                    : "Wallet provider"
              }
              className="rounded-xl"
            />
            {fieldErrors.provider && (
              <p className="mt-1 text-sm font-medium text-destructive">
                {fieldErrors.provider}
              </p>
            )}
          </div>

          <div>
            <Label>
              {newPaymentType === "card"
                ? "Card Number"
                : "Account / Phone / UPI Reference"}
            </Label>
            <Input
              value={newPaymentAccountRef}
              onChange={(e) => {
                setNewPaymentAccountRef(e.target.value);
                if (fieldErrors.accountRef)
                  setFieldErrors((p) => ({ ...p, accountRef: undefined }));
              }}
              aria-invalid={fieldErrors.accountRef ? true : undefined}
              placeholder={
                newPaymentType === "card"
                  ? "4111 1111 1111 1111"
                  : "Enter reference with digits"
              }
              className="rounded-xl"
            />
            {fieldErrors.accountRef ? (
              <p className="mt-1 text-sm font-medium text-destructive">
                {fieldErrors.accountRef}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Only the last 4 digits are stored in your profile display.
              </p>
            )}
          </div>

          {newPaymentType === "card" && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expiry Month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={newPaymentExpiryMonth}
                    onChange={(e) => {
                      setNewPaymentExpiryMonth(e.target.value);
                      if (fieldErrors.expiry)
                        setFieldErrors((p) => ({ ...p, expiry: undefined }));
                    }}
                    aria-invalid={fieldErrors.expiry ? true : undefined}
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
                    onChange={(e) => {
                      setNewPaymentExpiryYear(e.target.value);
                      if (fieldErrors.expiry)
                        setFieldErrors((p) => ({ ...p, expiry: undefined }));
                    }}
                    aria-invalid={fieldErrors.expiry ? true : undefined}
                    placeholder="YYYY"
                    className="rounded-xl"
                  />
                </div>
              </div>
              {fieldErrors.expiry && (
                <p className="mt-1 text-sm font-medium text-destructive">
                  {fieldErrors.expiry}
                </p>
              )}
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
            className="rounded-xl bg-gradient-to-r from-brand-500 to-red-500 hover:from-brand-600 hover:to-red-600 text-white"
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
  onRefresh,
}) => {
  const confirm = useConfirm();
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const handleSetDefaultPayment = useCallback(
    async (methodId: string) => {
      setIsUpdatingPayment(true);
      const res = await userService.updatePaymentMethod(methodId, {
        isDefault: true,
      });
      if (res.success && res.data?.paymentMethod) {
        toast.success("Default payment updated");
        await onRefresh();
      } else {
        toast.error("Update failed", {
          description:
            res.message || "Could not update default payment method.",
        });
      }
      setIsUpdatingPayment(false);
    },
    [onRefresh],
  );

  const handleDeletePaymentMethod = useCallback(
    async (methodId: string) => {
      const ok = await confirm({
        title: "Remove payment method",
        description: "Remove this payment method from your account?",
        confirmLabel: "Remove",
      });
      if (!ok) return;

      setIsUpdatingPayment(true);
      const res = await userService.deletePaymentMethod(methodId);
      if (res.success) {
        toast.success("Payment method removed");
        await onRefresh();
      } else {
        toast.error("Remove failed", {
          description: res.message || "Could not remove payment method.",
        });
      }
      setIsUpdatingPayment(false);
    },
    [onRefresh, confirm],
  );

  return (
    <div className="space-y-3">
      {paymentMethods.map((pm) => (
        <div
          key={pm._id}
          className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 capitalize">
                {pm.type} · {pm.provider}
                {pm.isDefault && (
                  <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
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
