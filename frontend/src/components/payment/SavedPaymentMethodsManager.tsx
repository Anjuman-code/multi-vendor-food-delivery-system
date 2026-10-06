import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PaymentBrandIcon } from '@/components/payment/PaymentBrandIcon';
import { CardPaymentForm, type CardFormData } from '@/components/payment/CardPaymentForm';
import { MobileWalletForm, type MobileWalletFormData } from '@/components/payment/MobileWalletForm';
import type { SupportedPaymentMethod } from '@/utils/paymentUtils';
import {
  CreditCard,
  Trash2,
  Plus,
  ShieldCheck,
  Star,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from '@/lib/toast';

export interface SavedPaymentMethodItem {
  id: string;
  type: 'card' | 'mobile_wallet';
  brand: string;
  last4?: string;
  walletNumber?: string;
  cardHolder?: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
}

export interface SavedPaymentMethodsManagerProps {
  savedMethods?: SavedPaymentMethodItem[];
  onAddCard?: (data: CardFormData) => Promise<void>;
  onAddWallet?: (data: MobileWalletFormData, method: SupportedPaymentMethod) => Promise<void>;
  onDeleteMethod?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  loading?: boolean;
}

export const SavedPaymentMethodsManager: React.FC<SavedPaymentMethodsManagerProps> = ({
  savedMethods = [],
  onAddCard,
  onAddWallet,
  onDeleteMethod,
  onSetDefault,
  loading = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<'card' | 'bkash' | 'nagad'>('card');
  const [cardForm, setCardForm] = useState<CardFormData>({
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: '',
    saveCard: true,
  });
  const [walletForm, setWalletForm] = useState<MobileWalletFormData>({
    walletNumber: '',
    pin: '',
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const handleSaveMethod = async () => {
    setSubmittingAdd(true);
    try {
      if (addType === 'card' && onAddCard) {
        if (!cardForm.cardNumber || !cardForm.expiry || !cardForm.cvv) {
          toast.error('Please complete all card details');
          return;
        }
        await onAddCard(cardForm);
        toast.success('Card added securely');
        setIsAdding(false);
        setCardForm({ cardNumber: '', cardHolder: '', expiry: '', cvv: '', saveCard: true });
      } else if ((addType === 'bkash' || addType === 'nagad') && onAddWallet) {
        if (!walletForm.walletNumber) {
          toast.error('Please enter your mobile wallet number');
          return;
        }
        await onAddWallet(walletForm, addType);
        toast.success(`${addType.toUpperCase()} wallet saved`);
        setIsAdding(false);
        setWalletForm({ walletNumber: '', pin: '' });
      }
    } catch {
      toast.error('Failed to save payment method');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteMethod) return;
    setActionLoadingId(id);
    try {
      await onDeleteMethod(id);
      toast.success('Payment method removed');
    } catch {
      toast.error('Failed to remove method');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!onSetDefault) return;
    setActionLoadingId(id);
    try {
      await onSetDefault(id);
      toast.success('Default payment method updated');
    } catch {
      toast.error('Failed to update default method');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Saved Payment Methods
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage your saved cards and mobile wallets for quick checkout.
          </p>
        </div>
        {!isAdding && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="h-8 gap-1.5 text-xs font-medium rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Method</span>
          </Button>
        )}
      </div>

      {/* Adding Form Section */}
      {isAdding && (
        <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Add New Payment Method
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={addType === 'card' ? 'default' : 'ghost'}
                onClick={() => setAddType('card')}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Card
              </Button>
              <Button
                type="button"
                size="sm"
                variant={addType === 'bkash' ? 'default' : 'ghost'}
                onClick={() => setAddType('bkash')}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                bKash
              </Button>
              <Button
                type="button"
                size="sm"
                variant={addType === 'nagad' ? 'default' : 'ghost'}
                onClick={() => setAddType('nagad')}
                className="h-7 text-xs px-2.5 rounded-lg"
              >
                Nagad
              </Button>
            </div>
          </div>

          {addType === 'card' ? (
            <CardPaymentForm
              value={cardForm}
              onChange={setCardForm}
              disabled={submittingAdd}
              showSaveCard={false}
            />
          ) : (
            <MobileWalletForm
              method={addType}
              value={walletForm}
              onChange={setWalletForm}
              disabled={submittingAdd}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submittingAdd}
              onClick={() => setIsAdding(false)}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAdd}
              onClick={handleSaveMethod}
              className="h-9 rounded-lg"
            >
              {submittingAdd ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </span>
              ) : (
                'Save Payment Method'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* List of Saved Methods */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : savedMethods.length === 0 && !isAdding ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
            <CreditCard className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">No saved payment methods</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-0.5 mb-3">
            Add a debit/credit card or bKash/Nagad wallet for seamless 1-click checkout.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-8 gap-1.5 text-xs rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Your First Method</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {savedMethods.map((method) => {
            const isLoadingAction = actionLoadingId === method.id;

            return (
              <div
                key={method.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border p-3.5 transition-all',
                  method.isDefault
                    ? 'border-primary/50 bg-primary/5 shadow-xs'
                    : 'border-border/80 bg-card hover:border-border',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PaymentBrandIcon
                    brandOrMethod={method.brand}
                    className="h-7 w-11 shadow-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {method.type === 'card'
                          ? `•••• •••• •••• ${method.last4}`
                          : method.walletNumber}
                      </span>
                      {method.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">
                          <Star className="h-2.5 w-2.5 fill-current" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {method.type === 'card'
                        ? `Expires ${method.expiryMonth}/${method.expiryYear} • ${method.cardHolder || 'CARDHOLDER'}`
                        : `${method.brand.toUpperCase()} Wallet`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!method.isDefault && onSetDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isLoadingAction}
                      onClick={() => handleSetDefault(method.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Make Default
                    </Button>
                  )}
                  {onDeleteMethod && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isLoadingAction}
                      onClick={() => handleDelete(method.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remove method"
                    >
                      {isLoadingAction ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Footer */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span>PCI DSS compliant. We do not store sensitive CVV or banking codes.</span>
      </div>
    </div>
  );
};

export default SavedPaymentMethodsManager;
