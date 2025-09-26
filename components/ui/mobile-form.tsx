"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Mobile-optimized form container
interface MobileFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  spacing?: "compact" | "normal" | "relaxed"
}

const MobileForm = React.forwardRef<HTMLFormElement, MobileFormProps>(
  ({ className, spacing = "normal", ...props }, ref) => {
    const spacingClasses = {
      compact: "space-y-3 md:space-y-4",
      normal: "space-y-4 md:space-y-6",
      relaxed: "space-y-6 md:space-y-8"
    }

    return (
      <form
        ref={ref}
        className={cn("form-mobile-spacing", spacingClasses[spacing], className)}
        {...props}
      />
    )
  }
)
MobileForm.displayName = "MobileForm"

// Mobile-optimized form field wrapper
interface MobileFormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  error?: string
  required?: boolean
  description?: string
}

const MobileFormField = React.forwardRef<HTMLDivElement, MobileFormFieldProps>(
  ({ className, label, error, required, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children}
        {error && (
          <p className="text-xs md:text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
MobileFormField.displayName = "MobileFormField"

// Mobile-optimized form actions (buttons)
interface MobileFormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "stacked" | "inline"
  align?: "left" | "center" | "right"
}

const MobileFormActions = React.forwardRef<HTMLDivElement, MobileFormActionsProps>(
  ({ className, variant = "stacked", align = "right", children, ...props }, ref) => {
    const variantClasses = {
      stacked: "flex flex-col-reverse sm:flex-row gap-3 sm:gap-2",
      inline: "flex flex-row gap-2"
    }

    const alignClasses = {
      left: "sm:justify-start",
      center: "sm:justify-center",
      right: "sm:justify-end"
    }

    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          alignClasses[align],
          "pt-4 md:pt-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
MobileFormActions.displayName = "MobileFormActions"

// Mobile-optimized fieldset
interface MobileFieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string
  description?: string
}

const MobileFieldset = React.forwardRef<HTMLFieldSetElement, MobileFieldsetProps>(
  ({ className, legend, description, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn("space-y-4 md:space-y-6", className)}
        {...props}
      >
        {legend && (
          <legend className="text-base md:text-lg font-semibold leading-none">
            {legend}
          </legend>
        )}
        {description && (
          <p className="text-sm text-muted-foreground -mt-2">
            {description}
          </p>
        )}
        <div className="space-y-4 md:space-y-6">
          {children}
        </div>
      </fieldset>
    )
  }
)
MobileFieldset.displayName = "MobileFieldset"

// Mobile-optimized form section
interface MobileFormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  collapsible?: boolean
  defaultOpen?: boolean
}

const MobileFormSection = React.forwardRef<HTMLDivElement, MobileFormSectionProps>(
  ({ 
    className, 
    title, 
    description, 
    collapsible = false, 
    defaultOpen = true, 
    children, 
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    return (
      <div
        ref={ref}
        className={cn("space-y-4 md:space-y-6", className)}
        {...props}
      >
        {title && (
          <div className="space-y-2">
            {collapsible ? (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg md:text-xl font-semibold">
                  {title}
                </h3>
                <span className="text-muted-foreground">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            ) : (
              <h3 className="text-lg md:text-xl font-semibold">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {(!collapsible || isOpen) && (
          <div className="space-y-4 md:space-y-6">
            {children}
          </div>
        )}
      </div>
    )
  }
)
MobileFormSection.displayName = "MobileFormSection"

export {
  MobileForm,
  MobileFormField,
  MobileFormActions,
  MobileFieldset,
  MobileFormSection
}