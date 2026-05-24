"use client"

import { PanelLeft, ChevronRight, MousePointer, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useSidebarStore, SidebarPreference } from "@/hooks/use-sidebar-store"

interface SidebarSwitcherCardsProps {
  className?: string
}

const sidebarOptions = [
  {
    value: "expanded",
    label: "Ausgeklappt",
    icon: PanelLeft,
    description: "Immer ausgeklappt",
    subtitle: "Fest fixiert"
  },
  {
    value: "collapsed",
    label: "Eingeklappt",
    icon: ChevronRight,
    description: "Immer eingeklappt",
    subtitle: "Nur Symbole"
  }
] as const

const getIconVariants = (iconType: typeof sidebarOptions[number]['value']) => {
  const baseVariants = {
    inactive: {
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 0.7,
    }
  }

  switch (iconType) {
    case "expanded":
      return {
        ...baseVariants,
        active: {
          y: -4,
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
    case "collapsed":
      return {
        ...baseVariants,
        active: {
          x: 3,
          scale: 1.15,
          rotate: 0,
          opacity: 1,
        },
        exit: {
          x: 0,
          scale: 0.9,
          rotate: 0,
          opacity: 0.6,
        }
      }
  }
}

export function SidebarSwitcherCards({ className }: SidebarSwitcherCardsProps) {
  const { preference, setPreference } = useSidebarStore()
  const { toast } = useToast()
  const [previousPreference, setPreviousPreference] = useState<SidebarPreference | undefined>(preference)

  useEffect(() => {
    if (preference !== previousPreference) {
      setPreviousPreference(preference)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference])

  const handlePreferenceChange = (value: typeof sidebarOptions[number]['value']) => {
    setPreference(value)
    const selectedOption = sidebarOptions.find(opt => opt.value === value)
    if (selectedOption) {
      toast({
        title: "Menüführung geändert",
        description: `${selectedOption.description} aktiviert.`,
        variant: "success",
      })
    }
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {sidebarOptions.map((option) => {
        const Icon = option.icon
        const isActive = preference === option.value
        const wasActive = previousPreference === option.value
        const iconVariants = getIconVariants(option.value)
        
        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => handlePreferenceChange(option.value)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 overflow-hidden cursor-pointer",
              "hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
              isActive
                ? "border-primary bg-primary/5 shadow-xs"
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
                  className="absolute inset-0 bg-linear-to-br from-primary/10 via-primary/5 to-transparent"
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
                    className="h-5 w-5 text-primary drop-shadow-xs" 
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
