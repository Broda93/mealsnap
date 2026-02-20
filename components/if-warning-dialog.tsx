"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface IFWarningDialogProps {
  open: boolean;
  windowText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function IFWarningDialog({ open, windowText, onConfirm, onCancel }: IFWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: "var(--bad-bg)" }}
            >
              <AlertTriangle className="h-5 w-5" style={{ color: "var(--bad)" }} />
            </div>
            <DialogTitle>Poza oknem IF</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Ten posilek jest poza oknem Intermittent Fasting (okno: {windowText}). Dodac mimo to?
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-xl"
          >
            Anuluj
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 rounded-xl"
            style={{ backgroundColor: "var(--bad)", color: "white" }}
          >
            Dodaj mimo to
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
