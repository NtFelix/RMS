"use client"

import React, { useState } from 'react'
import { Home, DollarSign, Trash2, Edit3 } from 'lucide-react'
import { BulkOperationDropdown } from './bulk-operation-dropdown'
import { BulkOperation } from '@/types/bulk-operations'
import { BulkOperationConfirmationDialog } from './bulk-operation-confirmation-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Sample operations for different table types
const sampleOperations: Record<string, BulkOperation[]> = {
  wohnungen: [
    {
      id: 'change-haus',
      label: 'Change Haus',
      icon: Home,
      requiresConfirmation: true,
      destructive: false,
      component: () => <div>Mock Component</div>
    },
    {
      id: 'archive',
      label: 'Archive Wohnungen',
      icon: Trash2,
      requiresConfirmation: true,
      destructive: true,
      component: () => <div>Mock Component</div>
    },
  ],
  finanzen: [
    {
      id: 'change-typ',
      label: 'Change Typ',
      icon: Edit3,
      requiresConfirmation: true,
      destructive: false,
      component: () => <div>Mock Component</div>
    },
    {
      id: 'delete',
      label: 'Delete Entries',
      icon: Trash2,
      requiresConfirmation: true,
      destructive: true,
      component: () => <div>Mock Component</div>
    },
  ],
  mieter: [
    {
      id: 'update-status',
      label: 'Update Status',
      icon: Edit3,
      requiresConfirmation: true,
      destructive: false,
      component: () => <div>Mock Component</div>
    },
    {
      id: 'export',
      label: 'Export Data',
      icon: DollarSign,
      requiresConfirmation: false,
      destructive: false,
      component: () => <div>Mock Component</div>
    },
  ],
}

const sampleAffectedItems = [
  'Apartment 1A - Main Street 123',
  'Apartment 2B - Oak Avenue 456',
  'Apartment 3C - Pine Road 789',
]

export function BulkOperationDemo() {
  const [selectedTableType, setSelectedTableType] = useState<string>('wohnungen')
  const [selectedCount, setSelectedCount] = useState(3)
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOperationSelect = (operation: BulkOperation) => {
    setSelectedOperation(operation)
    if (operation.requiresConfirmation) {
      setShowConfirmation(true)
    } else {
      handleConfirm()
    }
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    // Simulate operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    setShowConfirmation(false)
    setSelectedOperation(null)
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setSelectedOperation(null)
  }

  const operations = sampleOperations[selectedTableType] || []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operation Dropdown & Confirmation Demo</CardTitle>
          <CardDescription>
            Test the bulk operation dropdown and confirmation dialog with different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Table Type:</label>
              <select
                value={selectedTableType}
                onChange={(e) => setSelectedTableType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="wohnungen">Wohnungen</option>
                <option value="finanzen">Finanzen</option>
                <option value="mieter">Mieter</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Count:</label>
              <select
                value={selectedCount}
                onChange={(e) => setSelectedCount(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={1}>1 item</option>
                <option value={3}>3 items</option>
                <option value={8}>8 items</option>
                <option value={15}>15 items (requires typed confirmation)</option>
                <option value={50}>50 items (requires typed confirmation)</option>
              </select>
            </div>
          </div>

          {/* Demo Area */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </div>
              
              <BulkOperationDropdown
                operations={operations}
                selectedCount={selectedCount}
                isLoading={isLoading}
                onOperationSelect={handleOperationSelect}
              />
            </div>
          </div>

          {/* Test Scenarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Small Operation (≤10 items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Shows simple confirmation dialog with affected items preview
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCount(3)
                      setSelectedTableType('wohnungen')
                    }}
                  >
                    Test Small Operation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Large Operation (&gt;10 items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Requires typing "CONFIRM" to proceed with the operation
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCount(15)
                      setSelectedTableType('finanzen')
                    }}
                  >
                    Test Large Operation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Destructive Operation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Shows warning styling for destructive operations like delete
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedCount(5)
                      setSelectedTableType('wohnungen')
                      // Trigger archive operation
                      const archiveOp = sampleOperations.wohnungen.find(op => op.id === 'archive')
                      if (archiveOp) handleOperationSelect(archiveOp)
                    }}
                  >
                    Test Destructive Operation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">No Confirmation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Operations that execute immediately without confirmation
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCount(2)
                      setSelectedTableType('mieter')
                      // Trigger export operation
                      const exportOp = sampleOperations.mieter.find(op => op.id === 'export')
                      if (exportOp) handleOperationSelect(exportOp)
                    }}
                  >
                    Test No Confirmation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <BulkOperationConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        operation={selectedOperation}
        selectedCount={selectedCount}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        affectedItems={selectedCount <= 10 ? sampleAffectedItems.slice(0, selectedCount) : []}
      />
    </div>
  )
}