"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface ApartmentTenantRowSkeletonProps {
  count?: number
  showTitle?: boolean
}

export function ApartmentTenantRowSkeleton({ 
  count = 5, 
  showTitle = false 
}: ApartmentTenantRowSkeletonProps) {
  return (
    <div className="space-y-3">
      {showTitle && <Skeleton className="h-5 w-24 mb-3" />}
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-xl">
          {/* Left side - Apartment info skeleton */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>

          {/* Center - Tenant info skeleton */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>

          {/* Right side - Rent info and actions skeleton */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ApartmentTenantRowSkeletonCompact({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}