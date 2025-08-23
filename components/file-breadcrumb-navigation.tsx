"use client"

import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCloudStorageNavigation, BreadcrumbItem } from "@/hooks/use-cloud-storage-store"

interface FileBreadcrumbNavigationProps {
  className?: string
}

export function FileBreadcrumbNavigation({ className }: FileBreadcrumbNavigationProps) {
  const { breadcrumbs, navigateToPath } = useCloudStorageNavigation()

  const handleBreadcrumbClick = (breadcrumb: BreadcrumbItem) => {
    navigateToPath(breadcrumb.path)
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
              
              <button
                onClick={() => handleBreadcrumbClick(breadcrumb)}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 rounded-md transition-colors",
                  isLast 
                    ? "text-foreground font-medium cursor-default" 
                    : cn("cursor-pointer", getBreadcrumbColor(breadcrumb.type)),
                  !isLast && "hover:bg-accent"
                )}
                disabled={isLast}
                aria-current={isLast ? "page" : undefined}
              >
                {Icon && <span className="flex-shrink-0">{Icon}</span>}
                <span className="truncate max-w-[150px] sm:max-w-[200px]">
                  {breadcrumb.name}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}