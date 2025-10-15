"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

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

// Animation variants for different icon types
const getIconVariants = (iconType: typeof themeOptions[number]['value']) => {
  const baseVariants = {
    inactive: {
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 0.7,
    }
  }

  switch (iconType) {
    case "light": // Sun rises from below, expands rays
      return {
        ...baseVariants,
        active: {
          y: -6,
          scale: 1.2,
          rotate: 0,
          opacity: 1,
        },
        exit: {
          y: 8,
          scale: 0.85,
          rotate: -15,
          opacity: 0.5,
        }
      }
    case "dark": // Moon rises with slight arc motion
      return {
        ...baseVariants,
        active: {
          y: -6,
          scale: 1.2,
          rotate: -12,
          opacity: 1,
        },
        exit: {
          y: 8,
          scale: 0.85,
          rotate: 15,
          opacity: 0.5,
        }
      }
    case "system": // Monitor subtle pulse
      return {
        ...baseVariants,
        active: {
          y: -3,
          scale: 1.15,
          rotate: 0,
          opacity: 1,
        },
        exit: {
          y: 0,
          scale: 0.9,
          rotate: 0,
          opacity: 0.6,
        }
      }
  }
}

export function ThemeSwitcherCards({ className }: ThemeSwitcherCardsProps) {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [previousTheme, setPreviousTheme] = useState<string | undefined>(theme)

  useEffect(() => {
    if (theme !== previousTheme) {
      setPreviousTheme(theme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  const handleThemeChange = (value: typeof themeOptions[number]['value']) => {
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
        const wasActive = previousTheme === option.value
        const iconVariants = getIconVariants(option.value)
        
        return (
          <motion.button
            key={option.value}
            onClick={() => handleThemeChange(option.value)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 overflow-hidden",
              "hover:scale-[1.02] active:scale-[0.98]",
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20 hover:border-gray-300 dark:hover:border-gray-700"
            )}
            animate={{
              boxShadow: isActive 
                ? "0 4px 12px rgba(var(--primary-rgb), 0.15)" 
                : "0 0 0 rgba(0, 0, 0, 0)"
            }}
            transition={{ duration: 0.3 }}
            aria-label={`${option.description} auswählen`}
            aria-pressed={isActive}
          >
            {/* Animated background glow */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>

            {/* Checkbox with improved animation */}
            <AnimatePresence mode="wait">
              {isActive && (
                <motion.div
                  key="checkbox"
                  className="absolute top-3 right-3 z-10"
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    rotate: 0, 
                    opacity: 1,
                  }}
                  exit={{ 
                    scale: 0, 
                    rotate: 180, 
                    opacity: 0 
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    duration: 0.4
                  }}
                >
                  <CheckCircle2 
                    className="h-5 w-5 text-primary drop-shadow-sm" 
                    aria-hidden="true"
                    strokeWidth={2.5}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Icon with sophisticated animations */}
            <motion.div
              className="relative z-10"
              initial={false}
              animate={isActive ? "active" : wasActive ? "exit" : "inactive"}
              variants={iconVariants}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                mass: 0.8,
              }}
            >
              {/* Glow effect for active icon */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon 
                      className="h-8 w-8 text-primary"
                      aria-hidden="true"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main icon with stroke animation */}
              <motion.div
                animate={{
                  filter: isActive 
                    ? "drop-shadow(0 2px 4px rgba(var(--primary-rgb), 0.3))"
                    : "drop-shadow(0 0 0 rgba(0, 0, 0, 0))"
                }}
                transition={{ duration: 0.3 }}
              >
                <Icon 
                  className={cn(
                    "h-8 w-8 transition-all duration-300 relative z-10",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
            </motion.div>

            {/* Text labels with stagger animation */}
            <motion.div 
              className="flex flex-col items-center gap-1 relative z-10"
              animate={{
                y: isActive ? -2 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: 0.05
              }}
            >
              <motion.span 
                className={cn(
                  "text-sm font-semibold transition-colors duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-foreground"
                )}
                animate={{
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {option.label}
              </motion.span>
              <motion.span 
                className={cn(
                  "text-xs transition-colors duration-300",
                  isActive 
                    ? "text-primary/70" 
                    : "text-muted-foreground"
                )}
                animate={{
                  opacity: isActive ? 1 : 0.7,
                }}
                transition={{ duration: 0.2 }}
              >
                {option.subtitle}
              </motion.span>
            </motion.div>
          </motion.button>
        )
      })}
    </div>
  )
}
