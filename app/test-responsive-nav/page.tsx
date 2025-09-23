'use client'

import { useState, useEffect } from 'react'

export default function TestResponsiveNavPage() {
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setScreenSize({ width, height })
      setIsMobile(width < 768)
    }

    // Set initial size
    updateScreenSize()

    // Add resize listener
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold mb-4">Responsive Navigation Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Current Screen Size</h3>
            <p>Width: {screenSize.width}px</p>
            <p>Height: {screenSize.height}px</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Navigation Mode</h3>
            <p className={`font-medium ${isMobile ? 'text-blue-600' : 'text-green-600'}`}>
              {isMobile ? 'Mobile Navigation' : 'Desktop Navigation'}
            </p>
            <p className="text-sm text-gray-600">
              Breakpoint: {screenSize.width < 768 ? 'Below' : 'Above'} 768px
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Instructions</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-medium text-blue-800 mb-2">Requirement 4.1: Navigation switching at 768px breakpoint</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Resize browser window to cross 768px threshold</li>
              <li>• Verify navigation switches between mobile (bottom) and desktop (sidebar)</li>
              <li>• Check that transition is smooth without layout breaks</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-medium text-green-800 mb-2">Requirement 4.2: Mobile device sizes (320px to 767px)</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Test at 320px (iPhone SE): Navigation should fit without overflow</li>
              <li>• Test at 375px (iPhone 12 Mini): All items should be properly spaced</li>
              <li>• Test at 428px (iPhone 12 Pro Max): Touch targets should be adequate</li>
              <li>• Test at 767px: Should still show mobile navigation</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <h3 className="font-medium text-purple-800 mb-2">Requirement 4.3: Tablet-sized screens</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Test at 768px (iPad Mini): Should show desktop navigation</li>
              <li>• Test at 820px (iPad): Should use sidebar navigation</li>
              <li>• Test at 1024px (iPad Pro): Should definitely use desktop mode</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <h3 className="font-medium text-orange-800 mb-2">Requirement 4.4: No layout breaks during transitions</h3>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Rapidly resize window across breakpoint</li>
              <li>• Verify content remains visible and accessible</li>
              <li>• Check that dropdown states reset properly</li>
              <li>• Ensure no visual glitches or layout shifts</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-medium mb-2">Mobile Navigation Features to Test</h3>
          <ul className="text-sm space-y-1">
            <li>• Click "Mehr" button to open dropdown menu</li>
            <li>• Verify all navigation items are accessible</li>
            <li>• Test touch interactions on mobile devices</li>
            <li>• Check active state highlighting</li>
            <li>• Verify search functionality works</li>
          </ul>
        </div>
      </div>
    </div>
  )
}