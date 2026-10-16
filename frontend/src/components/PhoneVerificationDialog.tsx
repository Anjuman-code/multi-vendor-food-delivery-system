import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Phone, ShieldCheck } from "lucide-react";

export interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber?: string;
}

export const PhoneVerificationDialog: React.FC<PhoneVerificationDialogProps> = ({
  open,
  onOpenChange,
  phoneNumber,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Phone Number Verification</DialogTitle>
          <DialogDescription>
            How phone verification works on Food Rush.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <Phone className="w-8 h-8 text-brand-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">
              {phoneNumber || "No phone number set"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {phoneNumber
                ? "Registered for delivery updates & mobile wallet checkout"
                : "Please add a phone number in your profile details first"}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-900 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Automatic Checkout Verification
            </p>
            <p className="text-emerald-700 leading-relaxed">
              Separate SMS verification is not required to place orders. Your phone number is automatically verified when you complete a mobile wallet payment or receive your first delivery.
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-brand-500 to-red-500 hover:from-brand-600 hover:to-red-600 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Got it
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};