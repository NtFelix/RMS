import { BulkOperationDemo } from '@/components/bulk-operation-demo'

export default function TestBulkOperationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Operations Test</h1>
          <p className="text-gray-600 mt-2">
            Test the bulk operation dropdown and confirmation dialog components
          </p>
        </div>
        <BulkOperationDemo />
      </div>
    </div>
  )
}