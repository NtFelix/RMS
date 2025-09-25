export type TableType = 'wohnungen' | 'finanzen' | 'mieter' | 'haeuser' | 'betriebskosten'

export interface BulkOperationsState {
  selectedIds: Set<string>
  tableType: TableType | null
  isLoading: boolean
  error: string | null
  validationResult: ValidationResult | null
}

export interface ValidationRule {
  field: string
  validator: (value: any, record: any, operationData?: any) => boolean | string | Promise<boolean | string>
  message: string
}

export interface BulkOperation {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  requiresConfirmation: boolean
  destructive?: boolean
  disabled?: boolean
  disabledReason?: string
  validationRules?: ValidationRule[]
  component: React.ComponentType<BulkOperationProps>
}

export interface BulkOperationProps {
  selectedIds: string[]
  onConfirm: (data: any) => Promise<void>
  onCancel: () => void
  onDataChange?: (data: any) => void
}

export interface BulkOperationsContext {
  state: BulkOperationsState
  selectRow: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  clearSelectionOnPageChange: () => void
  clearSelectionOnFilterChange: () => void
  setTableType: (tableType: TableType) => void
  performBulkOperation: (operation: BulkOperation, data: any, options?: { skipValidation?: boolean }) => Promise<BulkOperationResponse | undefined>
  validateOperation: (operation: BulkOperation, data?: any) => Promise<ValidationResult | null>
}

export interface BulkOperationRequest {
  operation: string
  tableType: TableType
  selectedIds: string[]
  data: Record<string, any>
  userId: string
  validationResult?: ValidationResult
}

export interface BulkOperationResponse {
  success: boolean
  updatedCount: number
  failedIds: string[]
  errors: BulkOperationError[]
}

export interface BulkOperationError {
  id: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  validIds: string[]
  invalidIds: string[]
  errors: ValidationError[]
}

export interface ValidationError {
  id: string
  field: string
  message: string
}