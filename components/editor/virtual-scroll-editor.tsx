"use client"

import React, { 
  useRef, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react'
import { cn } from '@/lib/utils'

interface VirtualScrollItem {
  id: string
  height: number
  content: React.ReactNode
}

interface VirtualScrollProps {
  items: VirtualScrollItem[]
  containerHeight: number
  itemHeight?: number // Default item height for estimation
  overscan?: number // Number of items to render outside visible area
  className?: string
  onScroll?: (scrollTop: number, scrollHeight: number) => void
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void
}

export interface VirtualScrollRef {
  scrollToItem: (index: number, align?: 'start' | 'center' | 'end') => void
  scrollToTop: () => void
  scrollToBottom: () => void
  getScrollPosition: () => { scrollTop: number; scrollHeight: number }
}

export const VirtualScrollEditor = forwardRef<VirtualScrollRef, VirtualScrollProps>(({
  items,
  containerHeight,
  itemHeight = 50,
  overscan = 5,
  className,
  onScroll,
  onVisibleRangeChange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Cache for measured item heights
  const itemHeightsRef = useRef<Map<string, number>>(new Map())
  const itemOffsetsRef = useRef<Map<string, number>>(new Map())
  
  // Calculate total height and item positions
  const { totalHeight, visibleRange } = useMemo(() => {
    let currentOffset = 0
    const offsets = new Map<string, number>()
    
    // Calculate offsets for each item
    items.forEach((item, index) => {
      offsets.set(item.id, currentOffset)
      const height = itemHeightsRef.current.get(item.id) || item.height || itemHeight
      currentOffset += height
    })
    
    itemOffsetsRef.current = offsets
    
    // Calculate visible range
    const viewportStart = scrollTop
    const viewportEnd = scrollTop + containerHeight
    
    let startIndex = 0
    let endIndex = items.length - 1
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const offset = offsets.get(items[i].id) || 0
      const height = itemHeightsRef.current.get(items[i].id) || items[i].height || itemHeight
      
      if (offset + height >= viewportStart) {
        startIndex = Math.max(0, i - overscan)
        break
      }
    }
    
    // Find end index
    for (let i = startIndex; i < items.length; i++) {
      const offset = offsets.get(items[i].id) || 0
      
      if (offset > viewportEnd) {
        endIndex = Math.min(items.length - 1, i + overscan)
        break
      }
    }
    
    return {
      totalHeight: currentOffset,
      visibleRange: { startIndex, endIndex }
    }
  }, [items, scrollTop, containerHeight, itemHeight, overscan])
  
  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => {
      const actualIndex = visibleRange.startIndex + index
      const offset = itemOffsetsRef.current.get(item.id) || 0
      
      return {
        ...item,
        index: actualIndex,
        offset
      }
    })
  }, [items, visibleRange])
  
  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    setIsScrolling(true)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
    
    // Call onScroll callback
    onScroll?.(newScrollTop, event.currentTarget.scrollHeight)
  }, [onScroll])
  
  // Notify about visible range changes
  useEffect(() => {
    onVisibleRangeChange?.(visibleRange.startIndex, visibleRange.endIndex)
  }, [visibleRange.startIndex, visibleRange.endIndex, onVisibleRangeChange])
  
  // Measure item heights when they're rendered
  const measureItem = useCallback((itemId: string, element: HTMLElement | null) => {
    if (element) {
      const height = element.getBoundingClientRect().height
      itemHeightsRef.current.set(itemId, height)
    }
  }, [])
  
  // Expose scroll methods via ref
  useImperativeHandle(ref, () => ({
    scrollToItem: (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (!containerRef.current || index < 0 || index >= items.length) return
      
      const item = items[index]
      const offset = itemOffsetsRef.current.get(item.id) || 0
      const itemHeight = itemHeightsRef.current.get(item.id) || item.height || itemHeight
      
      let scrollTo = offset
      
      if (align === 'center') {
        scrollTo = offset - (containerHeight - itemHeight) / 2
      } else if (align === 'end') {
        scrollTo = offset - containerHeight + itemHeight
      }
      
      containerRef.current.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: 'smooth'
      })
    },
    
    scrollToTop: () => {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    },
    
    scrollToBottom: () => {
      containerRef.current?.scrollTo({ top: totalHeight, behavior: 'smooth' })
    },
    
    getScrollPosition: () => ({
      scrollTop,
      scrollHeight: totalHeight
    })
  }), [items, containerHeight, itemHeight, scrollTop, totalHeight])
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        {visibleItems.map((item) => (
          <div
            key={item.id}
            ref={(el) => measureItem(item.id, el)}
            style={{
              position: 'absolute',
              top: item.offset,
              left: 0,
              right: 0,
              minHeight: item.height || itemHeight
            }}
            className={cn(
              'transition-opacity duration-200',
              isScrolling ? 'opacity-90' : 'opacity-100'
            )}
          >
            {item.content}
          </div>
        ))}
      </div>
      
      {/* Scroll indicators */}
      {isScrolling && (
        <div className="fixed top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded z-50">
          {Math.round((scrollTop / (totalHeight - containerHeight)) * 100)}%
        </div>
      )}
    </div>
  )
})

VirtualScrollEditor.displayName = 'VirtualScrollEditor'

// Hook for managing virtual scroll state
export function useVirtualScroll(
  items: any[],
  containerHeight: number,
  itemHeight: number = 50
) {
  const [scrollPosition, setScrollPosition] = useState({ scrollTop: 0, scrollHeight: 0 })
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 })
  const virtualScrollRef = useRef<VirtualScrollRef>(null)
  
  const handleScroll = useCallback((scrollTop: number, scrollHeight: number) => {
    setScrollPosition({ scrollTop, scrollHeight })
  }, [])
  
  const handleVisibleRangeChange = useCallback((startIndex: number, endIndex: number) => {
    setVisibleRange({ startIndex, endIndex })
  }, [])
  
  const scrollToItem = useCallback((index: number, align?: 'start' | 'center' | 'end') => {
    virtualScrollRef.current?.scrollToItem(index, align)
  }, [])
  
  const scrollToTop = useCallback(() => {
    virtualScrollRef.current?.scrollToTop()
  }, [])
  
  const scrollToBottom = useCallback(() => {
    virtualScrollRef.current?.scrollToBottom()
  }, [])
  
  return {
    virtualScrollRef,
    scrollPosition,
    visibleRange,
    handleScroll,
    handleVisibleRangeChange,
    scrollToItem,
    scrollToTop,
    scrollToBottom
  }
}

// Utility function to convert editor content to virtual scroll items
export function contentToVirtualItems(
  content: any,
  estimatedHeight: number = 50
): VirtualScrollItem[] {
  if (!content || !content.content || !Array.isArray(content.content)) {
    return []
  }
  
  return content.content.map((node: any, index: number) => {
    // Estimate height based on node type
    let height = estimatedHeight
    
    switch (node.type) {
      case 'heading':
        height = node.attrs?.level === 1 ? 80 : node.attrs?.level === 2 ? 70 : 60
        break
      case 'paragraph':
        // Estimate based on text length
        const textLength = getNodeTextLength(node)
        height = Math.max(50, Math.ceil(textLength / 80) * 25)
        break
      case 'bulletList':
      case 'orderedList':
        height = (node.content?.length || 1) * 30 + 20
        break
      case 'blockquote':
        height = 80
        break
      case 'codeBlock':
        height = (node.content?.[0]?.text?.split('\n').length || 1) * 20 + 40
        break
      default:
        height = estimatedHeight
    }
    
    return {
      id: `node-${index}`,
      height,
      content: (
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <div className="text-sm text-gray-500 mb-1">
            {node.type} {node.attrs ? `(${Object.keys(node.attrs).join(', ')})` : ''}
          </div>
          <div className="prose prose-sm dark:prose-invert">
            {renderNodePreview(node)}
          </div>
        </div>
      )
    }
  })
}

// Helper function to get text length from a node
function getNodeTextLength(node: any): number {
  if (node.text) {
    return node.text.length
  }
  
  if (node.content && Array.isArray(node.content)) {
    return node.content.reduce((total: number, child: any) => {
      return total + getNodeTextLength(child)
    }, 0)
  }
  
  return 0
}

// Helper function to render a preview of a node
function renderNodePreview(node: any): React.ReactNode {
  if (node.text) {
    return <span>{node.text}</span>
  }
  
  if (node.content && Array.isArray(node.content)) {
    return (
      <>
        {node.content.map((child: any, index: number) => (
          <React.Fragment key={index}>
            {renderNodePreview(child)}
          </React.Fragment>
        ))}
      </>
    )
  }
  
  return <span className="text-gray-400 italic">[{node.type}]</span>
}