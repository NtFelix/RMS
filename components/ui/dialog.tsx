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
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
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
        target?.closest('input[placeholder*="suchen"]') ||
        target?.closest('input[placeholder*="Search"]') ||
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
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
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
        {...props}
      >
        {/* Always add a fallback DialogTitle for accessibility - will be overridden by actual DialogTitle if present */}
        <DialogTitle className="sr-only">Dialog</DialogTitle>
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close
            onClick={handleCloseButtonClick}
            className="absolute right-4 top-4 rounded-full p-3 opacity-70 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-gray-200 hover:scale-105 active:scale-95 hover:shadow-md dark:modal-close-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
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
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
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