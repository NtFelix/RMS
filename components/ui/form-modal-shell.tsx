"use client";

import * as React from "react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDesc,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitle_,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormModalAction {
  kind: "action";
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
}

type DropdownEntry = FormModalAction | { kind: "separator" };

export interface FormModalDeleteConfig {
  onDelete: () => Promise<void>;
  isDeleting: boolean;
  itemName: string;
  title?: string;
}

interface FormModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttemptClose?: () => void;
  isDirty?: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onSubmit?: (e: React.FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  loadingLabel?: string;
  children: React.ReactNode;
  actions?: FormModalAction[];
  deleteConfig?: FormModalDeleteConfig;
  variant?: "sheet" | "dialog";
  icon?: React.ComponentType<{ className?: string }>;
  contentClassName?: string;
  id?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

function SubmitContent({
  isSubmitting,
  submitLabel,
  loadingLabel = "Wird gespeichert...",
}: {
  isSubmitting: boolean;
  submitLabel: string;
  loadingLabel?: string;
}) {
  if (!isSubmitting) return <>{submitLabel}</>;
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-5 w-5" style={{ animationDuration: "600ms" }} viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {loadingLabel}
    </span>
  );
}

export function FormModalShell({
  open,
  onOpenChange,
  onAttemptClose,
  isDirty,
  title,
  description,
  onCancel,
  onSubmit,
  isSubmitting,
  submitLabel,
  loadingLabel,
  children,
  actions = [],
  deleteConfig,
  variant = "sheet",
  icon: Icon,
  contentClassName,
  id,
  size = "lg",
}: FormModalShellProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dropdownItems: DropdownEntry[] = [...actions];
  if (deleteConfig) {
    if (actions.length > 0) {
      dropdownItems.push({ kind: "separator" });
    }
    dropdownItems.push({
      kind: "action",
      label: "Löschen",
      icon: Trash2,
      onClick: () => setDeleteOpen(true),
      destructive: true,
    });
  }

  const actionsDropdown = dropdownItems.length > 0 && (
    <CustomDropdown
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg opacity-50 hover:opacity-100 hover:bg-hover-bg pointer-events-auto cursor-pointer h-8 w-8"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="sr-only">Aktionen</span>
        </Button>
      }
      align="end"
    >
      {dropdownItems.map((item, i) => {
        if (item.kind === "separator") {
          return <CustomDropdownSeparator key={`sep-${i}`} />;
        }
        return (
          <CustomDropdownItem
            key={item.label + "-" + i}
            onClick={item.onClick}
            className={item.destructive ? "text-red-600 focus:text-red-600" : undefined}
          >
            {item.icon && <item.icon className="h-4 w-4 mr-2" />}
            <span>{item.label}</span>
          </CustomDropdownItem>
        );
      })}
    </CustomDropdown>
  );

  const deleteDialog = deleteConfig && (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle_>
            {deleteConfig.title || "Eintrag löschen?"}
          </AlertDialogTitle_>
          <AlertDialogDesc>
            Möchten Sie &ldquo;{deleteConfig.itemName}&rdquo; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDesc>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteConfig.isDeleting}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={deleteConfig.onDelete}
            disabled={deleteConfig.isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteConfig.isDeleting ? "Löschen..." : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant === "dialog") {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            id={id}
            size={size !== "lg" ? size : undefined}
            className={contentClassName}
            isDirty={isDirty}
            onAttemptClose={onAttemptClose}
          >
            {actionsDropdown && (
              <div className="absolute right-12 top-4 z-10">
                {actionsDropdown}
              </div>
            )}
            <form onSubmit={onSubmit} className="flex flex-col">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pr-10">
                  <div>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                      <DialogDescription>{description}</DialogDescription>
                    )}
                  </div>
                </div>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {children}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <SubmitContent
                    isSubmitting={isSubmitting}
                    submitLabel={submitLabel}
                    loadingLabel={loadingLabel}
                  />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          id={id}
          className={cn(
            "sm:max-w-[600px] flex flex-col h-full p-0 gap-0",
            contentClassName,
          )}
          isDirty={isDirty}
          onAttemptClose={onAttemptClose}
        >
          {actionsDropdown && (
            <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-end px-4 z-10 pointer-events-none">
              <div className="pointer-events-auto">{actionsDropdown}</div>
            </div>
          )}
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1">
              <div className="max-w-[520px] mx-auto pt-20 pb-10 px-8 space-y-12">
                {Icon && (
                  <div className="text-primary/80">
                    <Icon className="h-10 w-10" />
                  </div>
                )}
                <div className="space-y-1">
                  <SheetTitle className="text-4xl font-bold tracking-tight">
                    {title}
                  </SheetTitle>
                  {description && (
                    <SheetDescription className="text-base text-muted-foreground/80">
                      {description}
                    </SheetDescription>
                  )}
                </div>
                {children}
              </div>
            </ScrollArea>
            <SheetFooter className="p-8 pt-4">
              <div className="max-w-[520px] mx-auto w-full flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:scale-[1.005] active:scale-[0.995] hover:shadow-none"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl h-11 shadow-sm font-semibold hover:scale-[1.005] active:scale-[0.995] hover:shadow-sm"
                >
                  <SubmitContent
                    isSubmitting={isSubmitting}
                    submitLabel={submitLabel}
                    loadingLabel={loadingLabel}
                  />
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      {deleteDialog}
    </>
  );
}
