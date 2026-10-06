import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/contexts/ConfirmContext";
import { toast } from "@/lib/toast";
import type { PaymentMethod } from "@/services/userService";
import userService from "@/services/userService";
import { PaymentBrandIcon } from "@/components/payment/PaymentBrandIcon";
import { CardPaymentForm, type CardFormData } from "@/components/payment/CardPaymentForm";
import { MobileWalletForm, type MobileWalletFormData } from "@/components/payment/MobileWalletForm";
import {
  detectCardBrand,
  validateLuhn,
  validateExpiryDate,
  validateCvv,
  validateBdPhone,
  type SupportedPaymentMethod,
} from "@/utils/paymentUtils";
import { CreditCard, Loader2, Smartphone, Trash2 } from "lucide-react";

export interface PaymentMethodsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethods: PaymentMethod[];
  isLoadingPayments: boolean;
  onSuccess?: () => void;
}

export const PaymentMethodsDialog: React.FC<PaymentMethodsDialogProps> = ({
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const [methodCategory, setMethodCategory] = useState<"card" | "wallet">("card");
  const [walletProvider, setWalletProvider] = useState<SupportedPaymentMethod>("bkash");
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [cardData, setCardData] = useState<CardFormData>({
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardFormData, string>>>({});

  const [walletData, setWalletData] = useState<MobileWalletFormData>({
    walletNumber: "",
    pin: "",
  });
  const [walletErrors, setWalletErrors] = useState<Partial<Record<keyof MobileWalletFormData, string>>>({});

  const resetForm = useCallback(() => {
    setMethodCategory("card");
    setWalletProvider("bkash");
    setIsDefault(false);
    setCardData({ cardNumber: "", cardHolder: "", expiry: "", cvv: "" });
    setCardErrors({});
    setWalletData({ walletNumber: "", pin: "" });
    setWalletErrors({});
  }, []);

  const handleSave = async () => {
    if (methodCategory === "card") {
      const cleanNum = cardData.cardNumber.replace(/\s+/g, "");
      const brand = detectCardBrand(cardData.cardNumber);
      const errors: Partial<Record<keyof CardFormData, string>> = {};

      if (!cleanNum || !validateLuhn(cleanNum)) {
        errors.cardNumber = "Enter a valid card number (Luhn verified).";
      }
      if (!cardData.cardHolder.trim()) {
        errors.cardHolder = "Cardholder name is required.";
      }
      if (!cardData.expiry || !validateExpiryDate(cardData.expiry)) {
        errors.expiry = "Enter a valid future expiry date (MM/YY).";
      }
      if (!cardData.cvv || !validateCvv(cardData.cvv, brand)) {
        errors.cvv = brand === "amex" ? "CVV must be 4 digits." : "CVV must be 3 digits.";
      }

      if (Object.keys(errors).length > 0) {
        setCardErrors(errors);
        toast.error("Please correct the highlighted card details.");
        return;
      }

      setCardErrors({});
      setIsSubmitting(true);
      try {
        const [monthStr, yearStr] = cardData.expiry.split("/");
        const expiryMonth = parseInt(monthStr, 10);
        const expiryYear = 2000 + parseInt(yearStr, 10);

        const token = `tok_card_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const res = await userService.addPaymentMethod({
          type: "card",
          provider: brand === "unknown" ? "Visa" : brand.toUpperCase(),
          token,
          last4: cleanNum.slice(-4),
          isDefault,
          expiryMonth,
          expiryYear,
        });

        if (res.success) {
          toast.success("Card saved securely.");
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        } else {
          toast.error(res.message || "Failed to save card.");
        }
      } catch {
        toast.error("An error occurred while saving the card.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Mobile wallet
      const errors: Partial<Record<keyof MobileWalletFormData, string>> = {};
      if (!walletData.walletNumber || !validateBdPhone(walletData.walletNumber)) {
        errors.walletNumber = "Enter a valid Bangladeshi mobile number (01XXXXXXXXX).";
      }

      if (Object.keys(errors).length > 0) {
        setWalletErrors(errors);
        toast.error("Please enter a valid mobile wallet number.");
        return;
      }

      setWalletErrors({});
      setIsSubmitting(true);
      try {
        const cleanPhone = walletData.walletNumber.replace(/[\s-]/g, "");
        const token = `tok_wallet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const res = await userService.addPaymentMethod({
          type: "wallet",
          provider: walletProvider.toUpperCase(),
          token,
          last4: cleanPhone.slice(-4),
          isDefault,
        });

        if (res.success) {
          toast.success(`${walletProvider.toUpperCase()} wallet saved securely.`);
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        } else {
          toast.error(res.message || "Failed to save mobile wallet.");
        }
      } catch {
        toast.error("An error occurred while saving the wallet.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-border bg-card">
        {/* Modal Header */}
        <div className="border-b border-border/80 bg-muted/20 px-6 py-4">
          <DialogTitle className="text-base font-bold text-foreground">
            Add Payment Method
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save a credit/debit card or Bangladeshi mobile wallet for 1-click checkout.
          </DialogDescription>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Method Type Selector Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMethodCategory("card");
                setCardErrors({});
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
                methodCategory === "card"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Credit / Debit Card</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMethodCategory("wallet");
                setWalletErrors({});
              }}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-all ${
                methodCategory === "wallet"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Mobile Wallet</span>
            </button>
          </div>

          {/* Form Content */}
          {methodCategory === "card" ? (
            <CardPaymentForm
              value={cardData}
              onChange={setCardData}
              errors={cardErrors}
              showSaveCard={false}
              disabled={isSubmitting}
            />
          ) : (
            <div className="space-y-4">
              {/* Wallet Provider Switcher */}
              <div className="grid grid-cols-4 gap-2">
                {(["bkash", "nagad", "rocket", "upay"] as SupportedPaymentMethod[]).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => {
                      setWalletProvider(prov);
                      setWalletErrors({});
                    }}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs font-semibold transition-all ${
                      walletProvider === prov
                        ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground"
                        : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <PaymentBrandIcon brandOrMethod={prov} className="h-5 w-8" />
                    <span className="capitalize">{prov}</span>
                  </button>
                ))}
              </div>

              <MobileWalletForm
                method={walletProvider}
                value={walletData}
                onChange={setWalletData}
                errors={walletErrors}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Set as Default Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border p-3.5 bg-muted/20">
            <div>
              <p className="text-sm font-medium text-foreground">Set as default payment method</p>
              <p className="text-xs text-muted-foreground">
                Automatically preselect this method during checkout.
              </p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="border-t border-border/80 bg-muted/20 px-6 py-3.5 sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="gap-2 font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Payment Method"
            )}
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
  const [actionId, setActionId] = useState<string | null>(null);

  const handleSetDefault = useCallback(
    async (methodId: string) => {
      setActionId(methodId);
      try {
        const res = await userService.setDefaultPaymentMethod(methodId);
        if (res.success) {
          toast.success("Default payment method updated");
          await onRefresh();
        } else {
          toast.error(res.message || "Failed to update default payment method");
        }
      } catch {
        toast.error("Failed to update default payment method");
      } finally {
        setActionId(null);
      }
    },
    [onRefresh],
  );

  const handleDelete = useCallback(
    async (methodId: string) => {
      const ok = await confirm({
        title: "Remove Payment Method",
        description: "Are you sure you want to remove this payment method from your account?",
        confirmLabel: "Remove",
      });
      if (!ok) return;

      setActionId(methodId);
      try {
        const res = await userService.deletePaymentMethod(methodId);
        if (res.success) {
          toast.success("Payment method removed");
          await onRefresh();
        } else {
          toast.error(res.message || "Failed to remove payment method");
        }
      } catch {
        toast.error("Failed to remove payment method");
      } finally {
        setActionId(null);
      }
    },
    [onRefresh, confirm],
  );

  return (
    <div className="space-y-3">
      {paymentMethods.map((pm) => (
        <div
          key={pm._id}
          className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shadow-2xs hover:border-border/80 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-14 shrink-0 rounded-lg border border-border bg-muted/40 p-1 flex items-center justify-center">
              <PaymentBrandIcon brandOrMethod={pm.provider || pm.type} className="h-6 w-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground capitalize text-sm">
                  {pm.provider} {pm.type === "card" ? "Card" : "Wallet"}
                </p>
                {pm.isDefault && (
                  <span className="text-[10px] font-bold uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                •••• {pm.last4}
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
                disabled={actionId === pm._id}
                onClick={() => handleSetDefault(pm._id)}
                className="h-8 text-xs font-medium rounded-lg"
              >
                Set Default
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={actionId === pm._id}
              onClick={() => handleDelete(pm._id)}
              className="h-8 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
