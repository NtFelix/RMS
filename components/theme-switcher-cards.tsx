"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

interface ThemeSwitcherCardsProps {
  className?: string
}

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
] as const

export function ThemeSwitcherCards({ className }: ThemeSwitcherCardsProps) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()

  const handleThemeChange = (value: string) => {
    setTheme(value)
    const selectedTheme = themeOptions.find(opt => opt.value === value)
    if (selectedTheme) {
      toast({
        title: "Design geändert",
        description: `${selectedTheme.description} aktiviert.`,
        variant: "success",
      })
    }
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
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20 hover:border-gray-300 dark:hover:border-gray-700"
            )}
            aria-label={`${option.description} auswählen`}
            aria-pressed={isActive}
          >
            {isActive && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <CheckCircle2 
                  className="absolute top-3 right-3 h-5 w-5 text-primary" 
                  aria-hidden="true"
                  strokeWidth={2.5}
                />
              </motion.div>
            )}
            <motion.div
              animate={{
                y: isActive ? -4 : 0,
                scale: isActive ? 1.15 : 1,
                rotate: isActive ? (option.value === "light" ? 0 : option.value === "dark" ? -10 : 0) : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                duration: 0.4
              }}
            >
              <Icon 
                className={cn(
                  "h-8 w-8 transition-colors duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                aria-hidden="true"
                strokeWidth={isActive ? 2.5 : 2}
              />
            </motion.div>
            <div className="flex flex-col items-center gap-1">
              <span 
                className={cn(
                  "text-sm font-semibold transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-foreground"
                )}
              >
                {option.label}
              </span>
              <span 
                className={cn(
                  "text-xs transition-colors",
                  isActive 
                    ? "text-primary/70" 
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
