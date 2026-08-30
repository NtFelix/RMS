"use client"

import { PanelLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
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
    subtitle: "Fest fixiert",
  },
  {
    value: "collapsed",
    label: "Eingeklappt",
    icon: ChevronRight,
    description: "Immer eingeklappt",
    subtitle: "Nur Symbole",
  },
] as const

export function SidebarSwitcherCards({ className }: SidebarSwitcherCardsProps) {
  const { preference, setPreference } = useSidebarStore()
  const { toast } = useToast()

  const handlePreferenceChange = (
    value: (typeof sidebarOptions)[number]["value"],
  ) => {
    setPreference(value)
    const selectedOption = sidebarOptions.find((opt) => opt.value === value)
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

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handlePreferenceChange(option.value)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer",
              "hover:scale-[1.02] active:scale-[0.98]",
              isActive
                ? "border-primary bg-primary/5 shadow-xs"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20 hover:border-gray-300 dark:hover:border-gray-700",
            )}
            aria-label={`${option.description} auswählen`}
            aria-pressed={isActive}
          >
            {isActive && (
              <CheckCircle2
                className="absolute top-3 right-3 size-5 text-primary"
                aria-hidden="true"
                strokeWidth={2.5}
              />
            )}

            <Icon
              className={cn(
                "size-8 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
              strokeWidth={isActive ? 2.5 : 2}
            />

            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-sm font-semibold transition-colors duration-200",
                  isActive ? "text-primary" : "text-foreground",
                )}
              >
                {option.label}
              </span>
              <span
                className={cn(
                  "text-xs transition-colors duration-200",
                  isActive ? "text-primary/70" : "text-muted-foreground",
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
