import * as React from "react";

import { cn } from "@/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const sizeClass = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof sizeClass;
  children: React.ReactNode;
  className?: string;
}

/**
 * shadcn Dialog wrapper for forms/wizards. Gives focus trap, Esc-to-close and
 * focus restore for free (replacing the hand-rolled `fixed inset-0` modals),
 * with a scrollable body and pinned header/footer.
 */
export const FormDialog: React.FC<FormDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  children,
  className,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className={cn(
        "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
        sizeClass[size],
        className,
      )}
    >
      <DialogHeader className="border-b border-border px-6 py-4 text-left">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && (
        <DialogFooter className="border-t border-border px-6 py-4">
          {footer}
        </DialogFooter>
      )}
    </DialogContent>
  </Dialog>
);
