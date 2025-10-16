"use client"

import { cn } from "@/lib/utils"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Tab } from "@/types/settings"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

interface SettingsSidebarProps {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  tabs: Omit<Tab, 'content'>[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export function SettingsSidebar({
  isSidebarCollapsed,
  onToggleSidebar,
  tabs,
  activeTab,
  onTabChange
}: SettingsSidebarProps) {
  return (
    <nav className={cn(
      "flex flex-col bg-background relative border-r border-border/50 rounded-2xl",
      "motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out",
      isSidebarCollapsed ? "w-20" : "w-60"
    )}>
      {/* Background Accent - No animation needed */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none rounded-2xl" />
      
      {/* Floating Toggle Pill */}
      <div className={cn(
        "relative z-10",
        isSidebarCollapsed ? "px-2 pt-4 pb-4" : "p-4 pb-4"
      )}>
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight">Einstellungen</h2>
            </div>
            <button
              onClick={onToggleSidebar}
              className={cn(
                "relative group h-9 w-9 rounded-lg motion-safe:transition-all motion-safe:duration-300",
                "bg-muted/50 hover:bg-muted border border-border/50 hover:border-border",
                "motion-safe:hover:shadow-md motion-safe:active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              aria-label="Einklappen"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <PanelLeftClose className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:scale-110" />
              </div>
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleSidebar}
            className={cn(
              "relative group h-11 w-11 rounded-full motion-safe:transition-all motion-safe:duration-300",
              "bg-muted/50 hover:bg-muted border border-border/50 hover:border-border",
              "motion-safe:hover:shadow-md motion-safe:active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            )}
            aria-label="Erweitern"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <PanelLeft className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:scale-110" />
            </div>
          </button>
        )}
      </div>
      
      {/* Vertical Tabs - Pill Shaped */}
      <div className={cn(
        "relative flex-1 pb-3",
        isSidebarCollapsed ? "px-2" : "pl-2 pr-5"
      )}>
        <div className="space-y-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "group relative overflow-hidden motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg motion-safe:active:translate-y-0",
                  isActive && "scale-[1.02]",
                  isSidebarCollapsed 
                    ? "h-11 w-11 rounded-full" 
                    : "w-full h-11 rounded-full"
                )}
                style={{
                  animationDelay: isActive ? `${index * 50}ms` : '0ms'
                }}
              >
                {/* Animated Background Layer */}
                <div className={cn(
                  "absolute inset-0 motion-safe:transition-all motion-safe:duration-500",
                  "rounded-full",
                  isActive
                    ? "bg-gradient-to-r from-primary via-primary to-primary/90 opacity-100"
                    : "bg-muted/30 opacity-0 group-hover:opacity-100"
                )} />
                
                {/* Border Glow with Reduced Motion Support */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 motion-safe:animate-pulse motion-reduce:animate-none" />
                )}
                
                {/* Hover Glow Effect */}
                <div className={cn(
                  "absolute inset-0 rounded-full opacity-0 motion-safe:group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-500",
                  "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
                )} />
                
                {/* Content */}
                <div className={cn(
                  "relative flex items-center h-full motion-safe:transition-all motion-safe:duration-500",
                  isSidebarCollapsed ? "justify-center px-2" : "px-2 gap-2.5"
                )}>
                  {/* Icon Container with Glow */}
                  <div className="relative">
                    {isActive && (
                      <div className="absolute inset-0 bg-primary-foreground/30 blur-lg rounded-full motion-safe:animate-pulse motion-reduce:animate-none" />
                    )}
                    <div className={cn(
                      "relative flex items-center justify-center rounded-full motion-safe:transition-all motion-safe:duration-500",
                      isSidebarCollapsed ? "h-7 w-7" : "h-7 w-7",
                      isActive
                        ? "bg-primary-foreground/20 shadow-lg motion-safe:scale-110"
                        : "bg-background/50 motion-safe:group-hover:bg-background/80 motion-safe:group-hover:scale-110"
                    )}>
                      <tab.icon className={cn(
                        "motion-safe:transition-all motion-safe:duration-500",
                        isActive 
                          ? "h-4 w-4 text-primary-foreground motion-safe:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
                          : "h-4 w-4 text-muted-foreground motion-safe:group-hover:text-foreground motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-3"
                      )} />
                    </div>
                  </div>
                  
                  {/* Label */}
                  {!isSidebarCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate motion-safe:transition-all motion-safe:duration-500",
                        isActive ? "text-primary-foreground tracking-wide" : "text-foreground group-hover:text-foreground"
                      )}>
                        {tab.label}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* HoverCard for Collapsed - Shows on hover and focus */}
                {isSidebarCollapsed && (
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50">
                        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl px-4 py-2 min-w-max">
                          <p className="text-sm font-semibold text-popover-foreground">{tab.label}</p>
                        </div>
                      </div>
                    </HoverCardTrigger>
                  </HoverCard>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  )
}
