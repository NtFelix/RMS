"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, CheckCircle2 } from "lucide-react"
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
      description: "Heller Modus",
      subtitle: "Immer hell"
    },
    {
      value: "dark",
      label: "Dunkel",
      icon: Moon,
      description: "Dunkler Modus",
      subtitle: "Immer dunkel"
    },
    {
      value: "system",
      label: "Auto",
      icon: Monitor,
      description: "System-Modus",
      subtitle: "Folgt System"
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
              "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-md",
              isActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20 hover:border-gray-300 dark:hover:border-gray-700"
            )}
            aria-label={`${option.description} auswählen`}
            aria-pressed={isActive}
          >
            {isActive && (
              <CheckCircle2 
                className="absolute top-3 right-3 h-5 w-5 text-blue-500" 
                aria-hidden="true"
                strokeWidth={2.5}
              />
            )}
            <Icon 
              className={cn(
                "h-8 w-8 transition-colors",
                isActive 
                  ? "text-blue-500" 
                  : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
            <div className="flex flex-col items-center gap-1">
              <span 
                className={cn(
                  "text-sm font-semibold transition-colors",
                  isActive 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-foreground"
                )}
              >
                {option.label}
              </span>
              <span 
                className={cn(
                  "text-xs transition-colors",
                  isActive 
                    ? "text-blue-600/70 dark:text-blue-400/70" 
                    : "text-muted-foreground"
                )}
              >
                {option.subtitle}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
