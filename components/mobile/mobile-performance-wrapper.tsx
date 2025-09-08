'use client'

import React, { Suspense, lazy, memo } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

// Lazy load mobile components for better performance
const LazyMobileBottomNav = lazy(() => 
  import('./mobile-bottom-nav').then(module => ({ 
    default: module.MobileBottomNav 
  }))
)

const LazyMobileAddMenu = lazy(() => 
  import('./mobile-add-menu').then(module => ({ 
    default: module.MobileAddMenu 
  }))
)

const LazyMobileMoreMenu = lazy(() => 
  import('./mobile-more-menu').then(module => ({ 
    default: module.MobileMoreMenu 
  }))
)

const LazyMobileFilterButton = lazy(() => 
  import('./mobile-filter-button').then(module => ({ 
    default: module.MobileFilterButton 
  }))
)

const LazyMobileSearchBar = lazy(() => 
  import('./mobile-search-bar').then(module => ({ 
    default: module.MobileSearchBar 
  }))
)

// Fallback component for loading states
const MobileFallback = memo(() => (
  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 md:hidden">
    <div className="flex items-center justify-around px-1 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div 
          key={i} 
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-xl animate-pulse"
        >
          <div className="w-5 h-5 bg-gray-200 rounded mb-1" />
          <div className="w-8 h-2 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  </div>
))

MobileFallback.displayName = 'MobileFallback'

// Performance-optimized mobile component wrapper
export interface MobilePerformanceWrapperProps {
  children?: React.ReactNode
}

export const MobilePerformanceWrapper = memo<MobilePerformanceWrapperProps>(({ children }) => {
  const isMobile = useIsMobile()

  // Don't render anything on desktop to save resources
  if (!isMobile) {
    return null
  }

  return (
    <Suspense fallback={<MobileFallback />}>
      {children}
    </Suspense>
  )
})

MobilePerformanceWrapper.displayName = 'MobilePerformanceWrapper'

// Lazy-loaded mobile navigation with performance optimizations
export interface LazyMobileBottomNavProps {
  currentPath?: string
}

export const LazyMobileBottomNavigation = memo<LazyMobileBottomNavProps>(({ currentPath }) => {
  const isMobile = useIsMobile()

  // Don't render anything on desktop - moved after hooks
  if (!isMobile) {
    return null
  }

  return (
    <MobilePerformanceWrapper>
      <LazyMobileBottomNav currentPath={currentPath} />
    </MobilePerformanceWrapper>
  )
})

LazyMobileBottomNavigation.displayName = 'LazyMobileBottomNavigation'

// Export lazy components for use in other parts of the app
export {
  LazyMobileBottomNav,
  LazyMobileAddMenu,
  LazyMobileMoreMenu,
  LazyMobileFilterButton,
  LazyMobileSearchBar
}