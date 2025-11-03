"use client"

import { cn } from "@/lib/utils"

export const SettingsCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

type SettingsSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const SettingsSection = ({ title, description, children, className, ...props }: SettingsSectionProps) => (
  <div className={cn("space-y-4", className)} {...props}>
    {title && (
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )}
    {children}
  </div>
)
