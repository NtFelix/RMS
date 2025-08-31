"use client"

import { Play } from "lucide-react"

interface VideoPosterProps {
  onClick?: () => void
  className?: string
}

export function VideoPoster({ onClick, className }: VideoPosterProps) {
  return (
    <div 
      className={`relative bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg overflow-hidden cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Mock dashboard content as poster */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <div className="w-4 h-4 bg-primary/60 rounded" />
          </div>
          <div className="flex-1">
            <div className="h-3 bg-muted/60 rounded w-3/4 mb-1" />
            <div className="h-2 bg-muted/40 rounded w-1/2" />
          </div>
        </div>
        
        <div className="space-y-3 mb-6">
          <div className="h-2 bg-muted/50 rounded w-full" />
          <div className="h-2 bg-muted/40 rounded w-5/6" />
          <div className="h-2 bg-muted/30 rounded w-4/6" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="h-16 bg-accent/30 rounded-md" />
          <div className="h-16 bg-accent/30 rounded-md" />
        </div>
        
        <div className="h-24 bg-background/60 rounded-lg border border-border/50" />
      </div>
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="bg-white/90 group-hover:bg-white rounded-full p-4 transition-colors">
          <Play className="w-8 h-8 text-black ml-1" />
        </div>
      </div>
      
      {/* Demo label */}
      <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
        Demo Video
      </div>
    </div>
  )
}