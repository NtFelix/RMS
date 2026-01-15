"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

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

const dialogContentVariants = cva(
  // Base styles - mobile-first: Full-width drawer from bottom
  [
    "fixed z-50 grid w-full gap-4 border bg-background shadow-xl duration-300",
    // Mobile positioning: bottom sheet style
    "inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl p-4 pb-6",
    // Mobile animations: slide up from bottom
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
    // Tablet and up: centered modal style
    "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[2rem] sm:p-6 sm:max-h-[85vh]",
    "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
    // Large screens: more padding
    "md:p-8 md:rounded-[2.5rem]",
  ],
  {
    variants: {
      size: {
        default: "", // No max-width, let child components set it
        sm: "sm:max-w-md",  // 448px - for very small dialogs
        md: "sm:max-w-lg",  // 512px - for confirmation dialogs
        lg: "sm:max-w-2xl", // 672px - for medium forms
        xl: "sm:max-w-4xl", // 896px - for large content
        full: "sm:max-w-[calc(100%-4rem)]", // Nearly full width with margin
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  VariantProps<typeof dialogContentVariants> {
  isDirty?: boolean
  onAttemptClose?: () => void // Changed: no event argument needed
  hideCloseButton?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, isDirty, onAttemptClose, hideCloseButton, size, ...props }, ref) => {

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
        className={cn(dialogContentVariants({ size }), className)}
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
            className="absolute right-3 top-3 rounded-full p-2 opacity-70 ring-offset-background transition-all duration-300 hover:opacity-100 hover:bg-gray-100 hover:scale-110 active:scale-95 hover:shadow-lg hover:rotate-90 dark:modal-close-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground sm:right-4 sm:top-4 sm:p-2.5 md:right-6 md:top-6"
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