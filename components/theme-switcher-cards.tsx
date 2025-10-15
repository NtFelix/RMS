"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface ThemeSwitcherCardsProps {
  className?: string
}

export function ThemeSwitcherCards({ className }: ThemeSwitcherCardsProps) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const themeOptions = [
    {
      value: "light",
      label: "Hell",
      icon: Sun,
      description: "Heller Modus"
    },
    {
      value: "dark",
      label: "Dunkel",
      icon: Moon,
      description: "Dunkler Modus"
    },
    {
      value: "system",
      label: "Auto",
      icon: Monitor,
      description: "System-Modus"
    }
  ]

  const handleThemeChange = (value: string) => {
    setTheme(value)
    const selectedTheme = themeOptions.find(opt => opt.value === value)
    toast({
      title: "Design geändert",
      description: `${selectedTheme?.description} aktiviert.`,
      variant: "success",
    })
  }

  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {themeOptions.map((option) => {
        const Icon = option.icon
        const isActive = theme === option.value
        
        return (
          <button
            key={option.value}
            onClick={() => handleThemeChange(option.value)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-md",
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20 hover:border-gray-300 dark:hover:border-gray-700"
            )}
            aria-label={`${option.description} auswählen`}
            aria-pressed={isActive}
          >
            <Icon 
              className={cn(
                "h-6 w-6 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
            <span 
              className={cn(
                "text-sm font-medium transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-foreground"
              )}
            >
              {option.label}
            </span>
            {isActive && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}
