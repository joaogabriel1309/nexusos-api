"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CriticalActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  itemName: string;
  impacts: string[];
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function CriticalActionDialog({ open, title, description, itemName, impacts, confirmLabel, isPending = false, onConfirm, onOpenChange }: CriticalActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-md" onEscapeKeyDown={(event) => isPending && event.preventDefault()} onPointerDownOutside={(event) => isPending && event.preventDefault()}>
        <DialogHeader className="pr-6">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">
          <p className="break-words font-medium text-foreground">{itemName}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
            {impacts.map((impact) => <li key={impact}>{impact}</li>)}
          </ul>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isPending ? "Processando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
