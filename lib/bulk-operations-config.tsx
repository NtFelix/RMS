'use client'

import React from 'react'
import { Home, DollarSign } from 'lucide-react'
import { BulkOperation, TableType } from '@/types/bulk-operations'
import { BulkChangeHausComponent } from '@/components/bulk-change-haus-component'
import { BulkChangeTypComponent } from '@/components/bulk-change-typ-component'
import { ValidationRuleBuilders } from '@/lib/bulk-operations-validation'

/**
 * Configuration for bulk operations with validation rules
 */
export const bulkOperationsConfig: Record<TableType, BulkOperation[]> = {
  wohnungen: [
    {
      id: 'changeHaus',
      label: 'Haus ändern',
      icon: Home,
      requiresConfirmation: true,
      destructive: false,
      validationRules: [
        // Ensure all selected Wohnungen exist and belong to user
        ValidationRuleBuilders.required('id', 'Wohnung not found'),
        ValidationRuleBuilders.required('user_id', 'Access denied'),
        
        // Ensure the target Haus exists and belongs to user
        ValidationRuleBuilders.custom(
          'target_haus_id',
          async (value: any, record: any, operationData?: any) => {
            if (!operationData?.hausId) {
              return 'Target house not specified'
            }
            
            try {
              const response = await fetch(`/api/haeuser/${operationData.hausId}`)
              if (!response.ok) {
                return 'Target house not found or access denied'
              }
              return true
            } catch {
              return 'Failed to validate target house'
            }
          },
          'Invalid target house'
        ),
        
        // Ensure Wohnung is not already assigned to the target Haus
        ValidationRuleBuilders.custom(
          'haus_id',
          (value: any, record: any, operationData?: any) => {
            if (value === operationData?.hausId) {
              return 'Wohnung is already assigned to this house'
            }
            return true
          },
          'Wohnung already assigned to target house'
        ),
        
        // Ensure Wohnung is not occupied (optional business rule)
        ValidationRuleBuilders.custom(
          'current_tenant',
          async (value: any, record: any) => {
            // This would check if there's an active tenant
            // For now, we'll allow the operation regardless
            return true
          },
          'Cannot reassign occupied apartment'
        )
      ],
      component: BulkChangeHausComponent
    }
  ],

  finanzen: [
    {
      id: 'changeTyp',
      label: 'Typ ändern',
      icon: DollarSign,
      requiresConfirmation: true,
      destructive: false,
      validationRules: [
        // Ensure all selected Finanzen exist and belong to user
        ValidationRuleBuilders.required('id', 'Finance entry not found'),
        ValidationRuleBuilders.required('user_id', 'Access denied'),
        
        // Ensure the target type is valid
        ValidationRuleBuilders.custom(
          'target_typ',
          (value: any, record: any, operationData?: any) => {
            if (!operationData || typeof operationData.ist_einnahmen !== 'boolean') {
              return 'Invalid target type specified'
            }
            return true
          },
          'Invalid target type'
        ),
        
        // Ensure entry is not already of the target type
        ValidationRuleBuilders.custom(
          'ist_einnahmen',
          (value: any, record: any, operationData?: any) => {
            if (typeof operationData?.ist_einnahmen === 'boolean' && 
                value === operationData.ist_einnahmen) {
              return 'Entry is already of this type'
            }
            return true
          },
          'Entry already has target type'
        ),
        
        // Ensure entry is not part of a locked period (business rule)
        ValidationRuleBuilders.custom(
          'datum',
          (value: any, record: any) => {
            // Check if the entry is in a locked accounting period
            // For now, we'll allow all operations
            return true
          },
          'Entry is in a locked accounting period'
        )
      ],
      component: BulkChangeTypComponent
    }
  ],

  mieter: [
    // Future bulk operations for tenants
  ],

  haeuser: [
    // Future bulk operations for houses
  ],

  betriebskosten: [
    // Future bulk operations for operating costs
  ]
}

/**
 * Gets available bulk operations for a table type
 */
export function getBulkOperations(tableType: TableType): BulkOperation[] {
  return bulkOperationsConfig[tableType] || []
}

/**
 * Gets a specific bulk operation by ID and table type
 */
export function getBulkOperation(tableType: TableType, operationId: string): BulkOperation | undefined {
  const operations = getBulkOperations(tableType)
  return operations.find(op => op.id === operationId)
}

/**
 * Checks if a table type supports bulk operations
 */
export function supportsBulkOperations(tableType: TableType): boolean {
  const operations = getBulkOperations(tableType)
  return operations.length > 0
}

/**
 * Gets validation rules for a specific operation
 */
export function getValidationRules(tableType: TableType, operationId: string) {
  const operation = getBulkOperation(tableType, operationId)
  return operation?.validationRules || []
}