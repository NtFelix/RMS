import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-xl border border-input bg-background ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      sizeVariant: {
        default: "h-10 px-4 py-2 text-base md:text-sm focus-visible:scale-[1.01] hover:border-ring/50",
        sm: "h-9 px-3 py-1 text-xs focus:border-primary focus:bg-background/80 hover:border-border/80",
      },
    },
    defaultVariants: {
      sizeVariant: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, sizeVariant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ sizeVariant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
