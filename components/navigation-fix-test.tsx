'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSimpleNavigation } from '@/hooks/use-simple-navigation'
import { useCloudStorageStore } from '@/hooks/use-cloud-storage-store'

interface NavigationFixTestProps {
  userId: string
}

/**
 * Test component to verify the navigation fix works without infinite loops
 */
export function NavigationFixTest({ userId }: NavigationFixTestProps) {
  const navigation = useSimpleNavigation(userId)
  const { currentPath, files, folders, isLoading } = useCloudStorageStore()
  const [renderCount, setRenderCount] = useState(0)

  // Track render count to detect infinite loops
  useEffect(() => {
    setRenderCount(prev => prev + 1)
  })

  const testPaths = [
    `user_${userId}`,
    `user_${userId}/test-folder-1`,
    `user_${userId}/test-folder-2`
  ]

  return (
    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
      <h3 className="font-semibold">Navigation Fix Test</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Navigation State:</strong>
          <div className="space-y-1 mt-1">
            <div>Nav Path: {navigation.currentPath || 'None'}</div>
            <div>Store Path: {currentPath || 'None'}</div>
            <div>Is Navigating: {navigation.isNavigating ? 'Yes' : 'No'}</div>
            <div>Is Loading: {isLoading ? 'Yes' : 'No'}</div>
          </div>
        </div>
        
        <div>
          <strong>Performance:</strong>
          <div className="space-y-1 mt-1">
            <div>Render Count: {renderCount}</div>
            <div className={renderCount > 10 ? 'text-red-500' : 'text-green-500'}>
              {renderCount > 10 ? 'Possible infinite loop!' : 'Normal rendering'}
            </div>
          </div>
        </div>
      </div>

      <div>
        <strong>Directory Contents:</strong>
        <div className="mt-2 space-y-1 text-sm">
          <div>Folders: {folders.length}</div>
          <div>Files: {files.length}</div>
        </div>
      </div>

      <div className="space-y-2">
        <strong>Test Navigation:</strong>
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

      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Expected:</strong> Render count should stay low (under 10) and navigation should work smoothly.
          If render count keeps increasing rapidly, there's still an infinite loop.
        </p>
      </div>
    </div>
  )
}