/**
 * Confirmation dialog for admin actions, built on the shadcn Dialog primitive
 * (focus-trap, Esc-to-close and focus-restore for free). Optionally collects a
 * required reason — used by suspend / ban / refund / reject flows.
 */
import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  reasonLabel?: string;
  /** Minimum reason length when `requireReason` is set. */
  minReasonLength?: number;
  destructive?: boolean;
  /** Extra content rendered above the actions (e.g. an amount input). */
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  requireReason = false,
  reasonPlaceholder = "Add a reason for the audit log…",
  reasonLabel = "Reason",
  minReasonLength = 5,
  destructive = true,
  children,
}) => {
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Reset the reason whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const canSubmit = !requireReason || reason.trim().length >= minReasonLength;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className={`mb-1 flex h-10 w-10 items-center justify-center rounded-xl ${
              destructive ? "bg-red-50 text-red-600" : "bg-accent text-accent-foreground"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        {requireReason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              className="resize-none"
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "brand"}
            onClick={handleConfirm}
            disabled={!canSubmit || loading}
          >
            {loading ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
