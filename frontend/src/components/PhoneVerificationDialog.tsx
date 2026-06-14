import { useEffect, useState } from "react";

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
import { toast } from "@/lib/toast";
import { Loader2, Phone } from "lucide-react";

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
  const [step, setStep] = useState<"send" | "verify">("send");
  const [isSending, setIsSending] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("send");
      setOtp("");
      setOtpError(null);
    }
  }, [open]);

  const handleSendCode = async () => {
    setIsSending(true);

    await new Promise((r) => setTimeout(r, 1200));
    setIsSending(false);
    setStep("verify");
    toast.success("Code Sent", {
      description: `A verification code has been sent to ${phoneNumber || "your phone"}.`,
    });
  };

  const handleVerify = () => {
    if (otp.trim().length < 6) {
      setOtpError("Enter the 6-digit code sent to your phone.");
      return;
    }
    setOtpError(null);
    toast.info("Verification", {
      description:
        "Phone verification is coming soon. We'll notify you when it's available!",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Phone Number</DialogTitle>
          <DialogDescription>
            {step === "send"
              ? "We'll send a verification code to your phone number."
              : "Enter the 6-digit code sent to your phone."}
          </DialogDescription>
        </DialogHeader>

        {step === "send" ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <Phone className="w-8 h-8 text-brand-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {phoneNumber || "No phone number set"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {phoneNumber
                  ? "A code will be sent to this number"
                  : "Please add a phone number first"}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendCode}
                disabled={!phoneNumber || isSending}
                className="rounded-xl bg-gradient-to-r from-brand-500 to-red-500 hover:from-brand-600 hover:to-red-600 text-white"
              >
                {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Code
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                if (otpError) setOtpError(null);
              }}
              placeholder="Enter 6-digit code"
              maxLength={6}
              aria-invalid={otpError ? true : undefined}
              className="rounded-xl text-center text-lg tracking-widest"
            />
            {otpError && (
              <p className="text-sm font-medium text-destructive">{otpError}</p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep("send")}
                className="rounded-xl"
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={otp.length < 6}
                className="rounded-xl bg-gradient-to-r from-brand-500 to-red-500 hover:from-brand-600 hover:to-red-600 text-white"
              >
                Verify
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};