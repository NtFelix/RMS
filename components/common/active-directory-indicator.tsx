'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDirectoryActiveState } from '@/hooks/use-active-state-manager'
import { MapPin, Folder, FolderOpen } from 'lucide-react'

interface ActiveDirectoryIndicatorProps {
  className?: string
  showIcon?: boolean
  showPath?: boolean
  variant?: 'default' | 'compact' | 'minimal'
}

/**
 * Visual indicator showing the current active directory
 * Provides consistent visual feedback across all navigation components
 */
export function ActiveDirectoryIndicator({ 
  className, 
  showIcon = true, 
  showPath = false,
  variant = 'default'
}: ActiveDirectoryIndicatorProps) {
  const { activeDirectoryPath, currentDirectory } = useDirectoryActiveState()
  const [displayPath, setDisplayPath] = useState<string>('')
  
  // Format the display path for better readability
  useEffect(() => {
    if (activeDirectoryPath) {
      // Extract meaningful parts from the path
      const pathParts = activeDirectoryPath.split('/').filter(Boolean)
      
      if (pathParts.length <= 1) {
        setDisplayPath('Cloud Storage')
      } else {
        // Remove user_ prefix and format nicely
        const meaningfulParts = pathParts.slice(1).map(part => {
          // Decode any URL encoding and format
          return decodeURIComponent(part).replace(/_/g, ' ')
        })
        
        if (meaningfulParts.length === 1) {
          setDisplayPath(meaningfulParts[0])
        } else {
          // Show last 2 parts for context
          const lastTwo = meaningfulParts.slice(-2)
          setDisplayPath(lastTwo.join(' / '))
        }
      }
    } else {
      setDisplayPath('')
    }
  }, [activeDirectoryPath])
  
  if (!activeDirectoryPath || !displayPath) {
    return null
  }
  
  const baseClasses = "flex items-center gap-2 text-sm"
  const variantClasses = {
    default: "px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg",
    compact: "px-2 py-1 bg-accent/5 rounded-md",
    minimal: "text-muted-foreground"
  }
  
  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label={`Current directory: ${displayPath}`}
    >
      {showIcon && (
        <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
      )}
      
      <span className="font-medium text-accent-foreground truncate">
        {showPath ? displayPath : 'Current Location'}
      </span>
      
      {showPath && (
        <Folder className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  )
}

/**
 * Compact version for use in headers or toolbars
 */
export function CompactActiveDirectoryIndicator({ className }: { className?: string }) {
  return (
    <ActiveDirectoryIndicator 
      className={className}
      variant="compact"
      showIcon={true}
      showPath={true}
    />
  )
}

/**
 * Minimal version for use in breadcrumbs or inline contexts
 */
export function MinimalActiveDirectoryIndicator({ className }: { className?: string }) {
  return (
    <ActiveDirectoryIndicator 
      className={className}
      variant="minimal"
      showIcon={false}
      showPath={true}
    />
  )
}

/**
 * Hook to get active directory status for custom components
 */
export function useActiveDirectoryStatus() {
  const { activeDirectoryPath, currentDirectory, isDirectoryActive } = useDirectoryActiveState()
  
  return {
    hasActiveDirectory: !!activeDirectoryPath,
    activeDirectoryPath,
    currentDirectory,
    isDirectoryActive,
    getActiveIndicatorProps: (path: string) => ({
      'data-active-directory': isDirectoryActive(path),
      'aria-current': isDirectoryActive(path) ? 'page' : undefined,
      className: isDirectoryActive(path) ? 'bg-accent/10 border-accent/20' : undefined
    })
  }
}