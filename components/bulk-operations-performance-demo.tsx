'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { useDebouncedBulkOperations, useOptimizedTableRendering } from '@/hooks/use-debounced-bulk-operations'
import { RowSelectionCheckbox } from '@/components/row-selection-checkbox'
import { SelectAllCheckbox } from '@/components/select-all-checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Clock, 
  Zap, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

// Generate test data
const generateTestData = (size: number) => {
  return Array.from({ length: size }, (_, index) => ({
    id: `item-${index}`,
    name: `Test Item ${index}`,
    value: Math.random() * 1000,
    category: ['A', 'B', 'C'][index % 3]
  }))
}

interface PerformanceDemoProps {
  dataSize?: number
}

function BulkOperationsPerformanceDemo({ dataSize = 1000 }: PerformanceDemoProps) {
  const [data] = useState(() => generateTestData(dataSize))
  const [startTime, setStartTime] = useState<number>(0)
  const [operationTime, setOperationTime] = useState<number>(0)
  
  const {
    selectedIds,
    selectRow,
    selectAll,
    clearSelection,
    performanceMetrics,
    isRowSelected,
    isAllSelected,
    isSomeSelected,
    flushPendingSelections
  } = useDebouncedBulkOperations({
    selectionDebounceMs: 50,
    enableBatching: true,
    maxBatchSize: 100,
    enablePerformanceMonitoring: true
  })

  const {
    data: processedData,
    renderingMetrics,
    isLargeDataset,
    recommendVirtualization
  } = useOptimizedTableRendering(data, {
    pageSize: 100,
    enableVirtualization: dataSize > 500,
    itemHeight: 40,
    virtualScrollHeight: 400
  })

  const allIds = useMemo(() => data.map(item => item.id), [data])
  const visibleIds = useMemo(() => processedData.slice(0, 20).map(item => item.id), [processedData])

  const handleSelectAll = () => {
    const start = performance.now()
    setStartTime(start)
    
    selectAll(allIds)
    
    // Measure completion time
    requestAnimationFrame(() => {
      const end = performance.now()
      setOperationTime(end - start)
    })
  }

  const handleRapidSelection = () => {
    const start = performance.now()
    setStartTime(start)
    
    // Simulate rapid selections
    for (let i = 0; i < 50; i++) {
      selectRow(`item-${i}`)
    }
    
    requestAnimationFrame(() => {
      const end = performance.now()
      setOperationTime(end - start)
    })
  }

  const getPerformanceStatus = () => {
    if (performanceMetrics.averageRenderTime > 16) return 'warning'
    if (performanceMetrics.batchProcessingTime > 10) return 'warning'
    return 'good'
  }

  const performanceStatus = getPerformanceStatus()

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Bulk Operations Performance Demo
            <Badge variant={dataSize > 1000 ? 'destructive' : dataSize > 500 ? 'secondary' : 'default'}>
              {dataSize} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{selectedIds.size}</div>
              <div className="text-sm text-muted-foreground">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceMetrics.renderCount}</div>
              <div className="text-sm text-muted-foreground">Renders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{performanceMetrics.averageRenderTime.toFixed(1)}ms</div>
              <div className="text-sm text-muted-foreground">Avg Render</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{operationTime.toFixed(1)}ms</div>
              <div className="text-sm text-muted-foreground">Last Operation</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Status</span>
              <div className="flex items-center gap-2">
                {performanceStatus === 'good' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                <Badge variant={performanceStatus === 'good' ? 'default' : 'secondary'}>
                  {performanceStatus === 'good' ? 'Optimal' : 'Needs Optimization'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Render Performance</span>
                <span>{Math.min(100, (16 / Math.max(performanceMetrics.averageRenderTime, 1)) * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(100, (16 / Math.max(performanceMetrics.averageRenderTime, 1)) * 100)}
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Dataset Info</div>
                <div className="text-muted-foreground">
                  Large Dataset: {isLargeDataset ? 'Yes' : 'No'}<br />
                  Virtualization: {recommendVirtualization ? 'Recommended' : 'Not Needed'}<br />
                  Strategy: {renderingMetrics.renderingStrategy}<br />
                  Memory Usage: {renderingMetrics.memoryUsage}
                </div>
              </div>
              <div>
                <div className="font-medium">Performance Metrics</div>
                <div className="text-muted-foreground">
                  Batch Time: {performanceMetrics.batchProcessingTime.toFixed(1)}ms<br />
                  Pending: {performanceMetrics.pendingSelectionsCount}<br />
                  Debounced Count: {performanceMetrics.debouncedSelectedCount}<br />
                  Has Pending: {performanceMetrics.hasPendingSelections ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={handleSelectAll} variant="outline">
              Select All ({allIds.length} items)
            </Button>
            <Button onClick={handleRapidSelection} variant="outline">
              Rapid Selection (50 items)
            </Button>
            <Button onClick={clearSelection} variant="outline">
              Clear Selection
            </Button>
            <Button onClick={flushPendingSelections} variant="outline">
              Flush Pending
            </Button>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <SelectAllCheckbox
                allIds={visibleIds}
                selectedIds={selectedIds}
                tableType="Demo Items"
              />
              <span className="text-sm font-medium">
                Select All Visible ({visibleIds.length} items)
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {processedData.slice(0, 20).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                  <RowSelectionCheckbox
                    rowId={item.id}
                    rowLabel={item.name}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Value: {item.value.toFixed(2)} | Category: {item.category}
                    </div>
                  </div>
                  <Badge variant={isRowSelected(item.id) ? 'default' : 'outline'}>
                    {isRowSelected(item.id) ? 'Selected' : 'Not Selected'}
                  </Badge>
                </div>
              ))}
              {processedData.length > 20 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  ... and {processedData.length - 20} more items
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {performanceStatus === 'warning' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Performance Warning</span>
            </div>
            <div className="text-yellow-700 mt-2 text-sm">
              {performanceMetrics.averageRenderTime > 16 && 
                "Render time is above optimal threshold (16ms for 60fps). "
              }
              {performanceMetrics.batchProcessingTime > 10 && 
                "Batch processing is slower than expected. "
              }
              Consider reducing dataset size or enabling virtualization for better performance.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function BulkOperationsPerformanceDemoPage() {
  const [dataSize, setDataSize] = useState(1000)

  return (
    <BulkOperationsProvider>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Bulk Operations Performance Demo</h1>
          <p className="text-muted-foreground mb-4">
            This demo shows the performance optimizations for bulk operations with large datasets.
            The system automatically enables virtualization and batching for datasets over 500 items.
          </p>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Dataset Size:</label>
            <div className="flex gap-2">
              {[100, 500, 1000, 2000, 5000].map((size) => (
                <Button
                  key={size}
                  variant={dataSize === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDataSize(size)}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <BulkOperationsPerformanceDemo dataSize={dataSize} />
      </div>
    </BulkOperationsProvider>
  )
}