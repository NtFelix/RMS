'use client'

import React from 'react'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { BulkOperationsProvider, useBulkOperations } from '@/context/bulk-operations-context'
import { BulkOperation } from '@/types/bulk-operations'
import { Button } from '@/components/ui/button'
import { Home, DollarSign } from 'lucide-react'

// Mock operations for demo
const mockOperations: BulkOperation[] = [
  {
    id: 'change-haus',
    label: 'Change Haus',
    icon: Home,
    requiresConfirmation: true,
    component: () => <div>Change Haus Component</div>
  },
  {
    id: 'change-typ',
    label: 'Change Typ',
    icon: DollarSign,
    requiresConfirmation: true,
    component: () => <div>Change Typ Component</div>
  }
]

// Demo table component
function DemoTable() {
  const { state, selectRow, selectAll, setTableType } = useBulkOperations()
  
  // Mock data
  const mockData = [
    { id: '1', name: 'Wohnung 1', haus: 'Haus A' },
    { id: '2', name: 'Wohnung 2', haus: 'Haus B' },
    { id: '3', name: 'Wohnung 3', haus: 'Haus A' },
    { id: '4', name: 'Wohnung 4', haus: 'Haus C' },
  ]

  React.useEffect(() => {
    setTableType('wohnungen')
  }, [setTableType])

  const allIds = mockData.map(item => item.id)
  const isAllSelected = allIds.every(id => state.selectedIds.has(id))
  const isPartiallySelected = allIds.some(id => state.selectedIds.has(id)) && !isAllSelected

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Bulk Action Bar Demo</h2>
      
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 p-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected
                  }}
                  onChange={() => selectAll(allIds)}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Haus</th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((item) => (
              <tr 
                key={item.id}
                className={`border-t hover:bg-gray-50 ${
                  state.selectedIds.has(item.id) ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={state.selectedIds.has(item.id)}
                    onChange={() => selectRow(item.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.haus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Select rows to see the BulkActionBar appear.</p>
        <p>Press Escape to clear selections.</p>
        <p>Selected IDs: {Array.from(state.selectedIds).join(', ') || 'None'}</p>
      </div>

      {/* BulkActionBar will appear when rows are selected */}
      <BulkActionBar operations={mockOperations} />
    </div>
  )
}

// Main demo component with provider
export function BulkActionBarDemo() {
  return (
    <BulkOperationsProvider>
      <DemoTable />
    </BulkOperationsProvider>
  )
}