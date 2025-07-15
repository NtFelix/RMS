"use client"

import { useState } from 'react'
import { PillTabSwitcher } from './pill-tab-switcher'

const demoTabs = [
  { id: '1', label: 'Login', value: 'login' },
  { id: '2', label: 'Register', value: 'register' }
]

export function PillTabSwitcherDemo() {
  const [activeTab, setActiveTab] = useState('login')

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold">PillTabSwitcher Responsive Demo</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Test the responsive design and touch optimization features:
        </p>
        <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
          <li>• <strong>Desktop:</strong> Hover effects, smaller touch targets, compact spacing</li>
          <li>• <strong>Mobile:</strong> Larger touch targets (44px min), no hover effects, touch feedback</li>
          <li>• <strong>Responsive:</strong> Full width on mobile, auto width on desktop</li>
          <li>• <strong>Touch:</strong> Optimized for touch interaction with proper feedback</li>
          <li>• <strong>Accessibility:</strong> Keyboard navigation and focus indicators</li>
        </ul>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Responsive Behavior Test</h3>
        <p className="text-sm text-muted-foreground">
          Resize your browser window or test on different devices to see responsive changes:
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <PillTabSwitcher
            tabs={demoTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Current active tab: <span className="font-medium">{activeTab}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Touch Optimization Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Mobile (&lt; 768px)</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Height: 56px (14 * 4px)</li>
              <li>• Padding: 6px (1.5rem)</li>
              <li>• Text: base size (16px)</li>
              <li>• Min touch target: 44px</li>
              <li>• Touch feedback enabled</li>
              <li>• Hover effects disabled</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Desktop (≥ 768px)</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Height: 48px (12 * 4px)</li>
              <li>• Padding: 4px (1rem)</li>
              <li>• Text: small size (14px)</li>
              <li>• Min touch target: 40px</li>
              <li>• Hover effects enabled</li>
              <li>• Precise cursor interaction</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}