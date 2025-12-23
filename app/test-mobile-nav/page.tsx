'use client'

import React from 'react'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'

export default function TestMobileNavPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Mobile Navigation Test</h1>
        <p className="mb-4">
          This page tests the mobile navigation component. 
          Resize your browser window to see the responsive behavior.
        </p>
        <div className="space-y-2 text-sm">
          <p><strong>Mobile (&lt; 768px):</strong> Navigation should appear at bottom</p>
          <p><strong>Desktop (≥ 768px):</strong> Navigation should be hidden</p>
        </div>
        
        <div className="mt-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Current Screen Info</h2>
          <p>Window width: <span id="window-width">Loading...</span>px</p>
          <p>Navigation visible: <span id="nav-visible">Loading...</span></p>
        </div>
      </div>
      
      <MobileBottomNavigation />
      
      <script dangerouslySetInnerHTML={{
        __html: `
          function updateScreenInfo() {
            document.getElementById('window-width').textContent = window.innerWidth;
            const nav = document.querySelector('nav[role="navigation"]');
            document.getElementById('nav-visible').textContent = nav ? 'Yes' : 'No';
          }
          
          updateScreenInfo();
          window.addEventListener('resize', updateScreenInfo);
        `
      }} />
    </div>
  )
}