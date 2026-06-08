"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronsRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-500 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  isDirty?: boolean
  onAttemptClose?: () => void
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, isDirty, onAttemptClose, ...props }, ref) => {
  const handleInteraction = (
    event: Parameters<NonNullable<React.ComponentProps<typeof SheetPrimitive.Content>['onInteractOutside']>>[0]
  ) => {
    if (!event) return;

    // Check if the interaction is with a combobox or popover element
    const target = event.target as Element;

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
      target?.hasAttribute('data-combobox-input')) {
      return;
    }

    if (isDirty && onAttemptClose) {
      event.preventDefault();
      onAttemptClose();
    } else if (props.onInteractOutside) {
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
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        onInteractOutside={handleInteraction}
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
        {children}
        <SheetPrimitive.Close asChild onClick={handleCloseButtonClick}>
          <Button variant="ghost" size="icon" className="absolute left-4 top-4 rounded-lg opacity-50 hover:opacity-100 hover:bg-hover-bg cursor-pointer h-8 w-8">
            <ChevronsRight className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
