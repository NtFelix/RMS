"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  isDirty?: boolean
  onAttemptClose?: () => void // Changed: no event argument needed
  hideCloseButton?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, isDirty, onAttemptClose, hideCloseButton, ...props }, ref) => {

  const handleInteraction = (
    event: Parameters<NonNullable<React.ComponentProps<typeof DialogPrimitive.Content>['onInteractOutside']>>[0]
  ) => {
    if (!event) return;

    // Check if the interaction is with a combobox or popover element
    const target = event.target as Element;

    // More comprehensive check for combobox elements
    if (target?.closest('[data-radix-popover-content]') ||
      target?.closest('[data-radix-popper-content-wrapper]') ||
      target?.hasAttribute('cmdk-input') ||
      target?.hasAttribute('cmdk-item') ||
      target?.hasAttribute('cmdk-list') ||
      target?.closest('[role="combobox"]') ||
      target?.closest('[role="option"]') ||
      target?.closest('[role="listbox"]') ||
      target?.closest('[data-dialog-ignore-interaction]') ||
      target?.closest('[data-combobox-dropdown]') ||
      target?.hasAttribute('data-combobox-input') ||
      target?.tagName === 'INPUT' && target?.closest('[data-radix-popover-content]')) {
      // Allow interactions with combobox elements - just return without preventing
      return;
    }

    if (isDirty && onAttemptClose) {
      event.preventDefault();
      onAttemptClose();
    } else if (props.onInteractOutside) {
      // Now 'event' is correctly typed as PointerDownOutsideEvent | FocusOutsideEvent (or whatever Radix uses)
      props.onInteractOutside(event);
    }
  };

  const handleCloseButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (isDirty && onAttemptClose) {
      event.preventDefault();
      onAttemptClose();
    }
    // If not dirty, or no onAttemptClose is provided, Radix's DialogPrimitive.Close will handle the close.
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-6 border bg-background p-6 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl sm:w-full sm:rounded-[2.5rem] sm:p-8",
          className
        )}
        onInteractOutside={handleInteraction} // Assign the correctly typed handler
        onOpenAutoFocus={(e) => {
          // Prevent auto focus to allow combobox inputs to work
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent auto focus on close
          e.preventDefault();
        }}
        onFocusOutside={(e) => {
          // Don't prevent focus from moving to combobox elements or when combobox is actively being used
          const target = e.target as Element;
          const activeComboboxInput = document.querySelector('[data-combobox-active="true"]')

          if (target?.hasAttribute('data-combobox-input') ||
            target?.hasAttribute('data-combobox-active') ||
            target?.closest('[data-dialog-ignore-interaction]') ||
            target?.closest('[data-combobox-dropdown]') ||
            target?.closest('[role="listbox"]') ||
            target?.closest('[role="option"]') ||
            activeComboboxInput) {
            e.preventDefault();
          }
        }}
        {...props}
      >
        {/* Always add a fallback DialogTitle for accessibility - will be overridden by actual DialogTitle if present */}
        <DialogTitle className="sr-only">Dialog</DialogTitle>
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            onClick={handleCloseButtonClick}
            className="absolute right-6 top-6 rounded-full p-2.5 opacity-70 ring-offset-background transition-all duration-300 hover:opacity-100 hover:bg-gray-100 hover:scale-110 active:scale-95 hover:shadow-lg hover:rotate-90 dark:modal-close-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}