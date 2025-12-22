'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useReliableNavigation } from '@/hooks/use-reliable-navigation'
import { useCloudStorageStore } from '@/hooks/use-cloud-storage-store'

interface NavigationTestProps {
  userId: string
}

/**
 * Test component to verify efficient navigation works correctly
 * This component can be temporarily added to test the navigation improvements
 */
export function CloudStorageNavigationTest({ userId }: NavigationTestProps) {
  const navigation = useReliableNavigation(userId)
  const { currentPath, files, folders, isLoading } = useCloudStorageStore()
  const [navigationCount, setNavigationCount] = useState(0)
  const [pageReloadCount, setPageReloadCount] = useState(0)

  // Track page reloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      setPageReloadCount(prev => prev + 1)
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Track navigation events
  useEffect(() => {
    if (currentPath) {
      setNavigationCount(prev => prev + 1)
    }
  }, [currentPath])

  const testPaths = [
    `user_${userId}`,
    `user_${userId}/test-folder-1`,
    `user_${userId}/test-folder-2`,
    `user_${userId}/test-folder-1/subfolder`
  ]

  return (
    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
      <h3 className="font-semibold">Navigation Test Panel</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Current Path:</strong>
          <div className="font-mono text-xs bg-background p-2 rounded mt-1">
            {currentPath || 'Not set'}
          </div>
        </div>
        
        <div>
          <strong>Navigation Stats:</strong>
          <div className="space-y-1 mt-1">
            <div>Navigations: {navigationCount}</div>
            <div>Page Reloads: {pageReloadCount}</div>
            <div>Is Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Is Navigating: {navigation.isNavigating ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      <div>
        <strong>Current Directory Contents:</strong>
        <div className="mt-2 space-y-1">
          <div>Folders: {folders.length}</div>
          <div>Files: {files.length}</div>
          {folders.length > 0 && (
            <div className="text-xs">
              Folders: {folders.map(f => f.name).join(', ')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <strong>Test Navigation (Client-side):</strong>
        <div className="flex flex-wrap gap-2">
          {testPaths.map((path, index) => (
            <Button
              key={path}
              variant="outline"
              size="sm"
              onClick={() => navigation.navigate(path, { clientOnly: true })}
              disabled={navigation.isNavigating}
            >
              Path {index + 1}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <strong>Test Navigation (Server-side):</strong>
        <div className="flex flex-wrap gap-2">
          {testPaths.map((path, index) => (
            <Button
              key={path}
              variant="secondary"
              size="sm"
              onClick={() => navigation.navigate(path, { clientOnly: false })}
              disabled={navigation.isNavigating}
            >
              SSR Path {index + 1}
            </Button>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Expected behavior:</strong> Client-side navigation should not trigger page reloads.
          Only the file/folder content should update while the header, upload button, and other UI elements remain unchanged.
        </p>
        <p className="mt-1">
          <strong>Server-side navigation</strong> will trigger full page reloads (for comparison).
        </p>
      </div>
    </div>
  )
}