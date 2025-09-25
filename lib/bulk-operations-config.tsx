import { BulkOperation, TableType } from '@/types/bulk-operations'
import { BulkChangeHausComponent } from '@/components/bulk-change-haus-component'
import { Home } from 'lucide-react'

export const getBulkOperationsForTable = (tableType: TableType): BulkOperation[] => {
  switch (tableType) {
    case 'wohnungen':
      return [
        {
          id: 'changeHaus',
          label: 'Haus ändern',
          icon: Home,
          requiresConfirmation: true,
          destructive: false,
          component: BulkChangeHausComponent,
          validationRules: [
            {
              field: 'hausId',
              validator: (value: any) => !!value,
              message: 'Ein Haus muss ausgewählt werden'
            }
          ]
        }
      ]
    
    case 'finanzen':
      return [
        // Will be implemented in task 7
      ]
    
    case 'mieter':
    case 'haeuser':
    case 'betriebskosten':
    default:
      return []
  }
}

export const validateBulkOperation = (
  operation: BulkOperation,
  data: any,
  selectedRecords?: any[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!operation.validationRules) {
    return { isValid: true, errors: [] }
  }

  for (const rule of operation.validationRules) {
    const fieldValue = data[rule.field]
    const isValid = rule.validator(fieldValue, selectedRecords)
    
    if (!isValid) {
      errors.push(rule.message)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}