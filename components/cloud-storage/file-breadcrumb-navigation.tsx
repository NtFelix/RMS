"use client"

import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCloudStorageStore, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"
import { useFolderNavigation } from "@/components/common/navigation-interceptor"
import { useBreadcrumbActiveState, useActiveStateSync } from "@/hooks/use-active-state-manager"
import { useEffect } from "react"

interface FileBreadcrumbNavigationProps {
  userId: string
  className?: string
}

export function FileBreadcrumbNavigation({ userId, className }: FileBreadcrumbNavigationProps) {
  const { breadcrumbs } = useCloudStorageStore()
  const { handleFolderClick, isNavigating } = useFolderNavigation(userId)
  const { isDirectoryActive, getDirectoryActiveClasses } = useBreadcrumbActiveState()
  const { updateBreadcrumbs } = useActiveStateSync()
  
  // Sync breadcrumbs with active state manager
  useEffect(() => {
    if (breadcrumbs.length > 0) {
      updateBreadcrumbs(breadcrumbs)
    }
  }, [breadcrumbs, updateBreadcrumbs])

  // Handle breadcrumb click with navigation interceptor
  const handleBreadcrumbClick = async (path: string) => {
    try {
      await handleFolderClick(path)
    } catch (error) {
      console.error('Breadcrumb navigation failed:', error)
    }
  }

  const getBreadcrumbIcon = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'root':
        return <Home className="h-3 w-3" />
      default:
        return null
    }
  }

  const getBreadcrumbColor = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'house':
        return 'text-blue-600 hover:text-blue-700'
      case 'apartment':
        return 'text-green-600 hover:text-green-700'
      case 'tenant':
        return 'text-purple-600 hover:text-purple-700'
      case 'category':
        return 'text-orange-600 hover:text-orange-700'
      default:
        return 'text-foreground hover:text-foreground/80'
    }
  }

  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          const Icon = getBreadcrumbIcon(breadcrumb.type)
          
          return (
            <li key={breadcrumb.path} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
              )}
              
              {isLast ? (
                <span
                  className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-md transition-colors",
                    "text-foreground font-medium cursor-default",
                    getDirectoryActiveClasses(breadcrumb.path)
                  )}
                  aria-current="page"
                  data-active-directory={isDirectoryActive(breadcrumb.path)}
                >
                  {Icon && <span className="flex-shrink-0">{Icon}</span>}
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {breadcrumb.name}
                  </span>
                </span>
              ) : (
                <button
                  onClick={() => handleBreadcrumbClick(breadcrumb.path)}
                  className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-md transition-colors",
                    cn("cursor-pointer", getBreadcrumbColor(breadcrumb.type)),
                    "hover:bg-accent",
                    isDirectoryActive(breadcrumb.path) && "bg-accent/10"
                  )}
                  data-folder-path={breadcrumb.path}
                  data-active-directory={isDirectoryActive(breadcrumb.path)}
                  disabled={isNavigating}
                  aria-current={isDirectoryActive(breadcrumb.path) ? "page" : undefined}
                >
                  {Icon && <span className="flex-shrink-0">{Icon}</span>}
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    {breadcrumb.name}
                  </span>
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}