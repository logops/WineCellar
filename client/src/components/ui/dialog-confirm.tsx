import React, { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  cancelText?: string;
  confirmText?: string;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Continue",
  children,
}: ConfirmDialogProps) {
  // Add event listener to handle custom close events
  React.useEffect(() => {
    const handleCloseEvent = () => {
      if (open) onOpenChange(false);
    };
    
    document.addEventListener('close-dialog', handleCloseEvent);
    return () => document.removeEventListener('close-dialog', handleCloseEvent);
  }, [open, onOpenChange]);
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {typeof description === "string" ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : (
            description
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}