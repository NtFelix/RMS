'use client'

import React from 'react'
import { SelectableTable } from '@/components/selectable-table'
import { ApartmentTable, Apartment } from '@/components/apartment-table'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { getBulkOperationsForTable } from '@/lib/bulk-operations-config'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { MutableRefObject } from 'react'

interface SelectableApartmentTableWrapperProps {
  filter: string
  searchQuery: string
  reloadRef?: MutableRefObject<(() => void) | null>
  onEdit?: (apt: Apartment) => void
  onTableRefresh?: () => Promise<void>
  initialApartments?: Apartment[]
}

export function SelectableApartmentTableWrapper({
  filter,
  searchQuery,
  reloadRef,
  onEdit,
  onTableRefresh,
  initialApartments = []
}: SelectableApartmentTableWrapperProps) {
  const { state } = useBulkOperations()
  
  // Get bulk operations for wohnungen table
  const bulkOperations = getBulkOperationsForTable('wohnungen')
  
  // Get affected items preview for the action bar
  const getAffectedItemsPreview = (selectedIds: string[]) => {
    return initialApartments
      .filter(apt => selectedIds.includes(apt.id))
      .map(apt => apt.name)
  }

  return (
    <div className="relative">
      <SelectableTable
        data={initialApartments}
        tableType="wohnungen"
        bulkOperations={bulkOperations}
      >
        <ApartmentTable
          filter={filter}
          searchQuery={searchQuery}
          reloadRef={reloadRef}
          onEdit={onEdit}
          onTableRefresh={onTableRefresh}
          initialApartments={initialApartments}
        />
      </SelectableTable>
      
      {/* Bulk Action Bar */}
      {state.selectedIds.size > 0 && (
        <BulkActionBar
          operations={bulkOperations}
          getAffectedItemsPreview={getAffectedItemsPreview}
        />
      )}
    </div>
  )
}