import * as React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

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
  cancelLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  reasonLabel?: string;
  /** Minimum reason length when `requireReason` is set. */
  minReasonLength?: number;
  destructive?: boolean;
  /** External loading indicator override */
  loading?: boolean;
  /** Extra content rendered above the actions (e.g. an amount input). */
  children?: React.ReactNode;
}

/**
 * Accessible confirmation dialog built on Radix Dialog primitive.
 * Focus-trapped, Esc-to-close, and focus-restored.
 * Supports async confirmation with built-in button loading state,
 * optional reason input (for audit logs/rejections), and destructive styling.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  requireReason = false,
  reasonPlaceholder = "Add a reason for the audit log…",
  reasonLabel = "Reason",
  minReasonLength = 5,
  destructive = true,
  loading: externalLoading,
  children,
}) => {
  const [reason, setReason] = React.useState("");
  const [internalLoading, setInternalLoading] = React.useState(false);

  const isLoading = externalLoading ?? internalLoading;

  // Reset reason whenever the dialog opens.
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const canSubmit = !requireReason || reason.trim().length >= minReasonLength;

  const handleConfirm = async () => {
    if (!canSubmit || isLoading) return;
    setInternalLoading(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onClose();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${
              destructive
                ? "bg-red-50 text-red-600"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {destructive ? (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        {requireReason && (
          <div className="space-y-1.5 my-2">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              className="resize-none"
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "brand"}
            onClick={handleConfirm}
            disabled={!canSubmit || isLoading}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
