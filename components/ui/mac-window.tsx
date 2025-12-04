'use client'

import React from 'react'

interface MacWindowProps {
  children: React.ReactNode
  className?: string
}

export function MacWindow({ children, className = '' }: MacWindowProps) {
  return (
    <div className={`bg-background border rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3),0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_60px_hsl(var(--primary)),0_0_100px_hsl(var(--primary)/0.5)] ${className}`}>
      {/* macOS Window Header */}
      <div className="bg-muted/30 border-b px-4 py-3 flex items-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
        </div>
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}
