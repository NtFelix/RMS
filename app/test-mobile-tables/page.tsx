"use client"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"

interface TestData {
  id: string
  name: string
  location: string
  status: string
  value: number
  date: string
}

const testData: TestData[] = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Item ${i + 1}`,
  location: `Location ${Math.floor(i / 5) + 1}`,
  status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'inactive' : 'pending',
  value: (i + 1) * 100,
  date: new Date(2024, i % 12, (i % 28) + 1).toLocaleDateString('de-DE'),
}))

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Standort" />
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge 
          variant={
            status === 'active' ? 'default' : 
            status === 'inactive' ? 'destructive' : 
            'secondary'
          }
        >
          {status === 'active' ? 'Aktiv' : 
           status === 'inactive' ? 'Inaktiv' : 
           'Ausstehend'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value === "all" || value === row.getValue(id)
    },
  },
  {
    accessorKey: "value",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wert" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("value") as number
      return <div className="text-right font-mono">{value.toLocaleString('de-DE')} €</div>
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Datum" />
    ),
  },
]

export default function TestMobileTablesPage() {
  const handleRowClick = (row: TestData) => {
    alert(`Clicked on: ${row.name}`)
  }

  const handleExport = (format: 'csv' | 'pdf') => {
    alert(`Exporting as ${format.toUpperCase()}`)
  }

  const filters = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Aktiv", value: "active" },
        { label: "Inaktiv", value: "inactive" },
        { label: "Ausstehend", value: "pending" },
      ],
      type: "select" as const,
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Mobile Data Table Test</h1>
        <p className="text-muted-foreground">
          Test the mobile responsiveness of the enhanced data tables. 
          Try resizing your browser window or viewing on a mobile device.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Features to test:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Horizontal scrolling on narrow screens</li>
            <li>Mobile-optimized toolbar with collapsible filters</li>
            <li>Touch-friendly pagination controls</li>
            <li>Swipe gestures for pagination (left/right swipe)</li>
            <li>Touch feedback on row interactions</li>
            <li>Column visibility controls</li>
            <li>Export functionality</li>
          </ul>
        </div>

        <DataTable
          columns={columns}
          data={testData}
          searchKey="name"
          searchPlaceholder="Suche nach Namen..."
          enableSelection={true}
          enablePagination={true}
          enableColumnVisibility={true}
          enableExport={true}
          onRowClick={handleRowClick}
          filters={filters}
          onExport={handleExport}
          className="mobile-test-table"
        />
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Mobile Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Resize your browser window to mobile width (&lt;768px)</li>
          <li>Verify the table scrolls horizontally</li>
          <li>Test the filter toggle button</li>
          <li>Try swiping left/right on the table for pagination</li>
          <li>Test touch interactions on rows</li>
          <li>Verify export and column visibility work on mobile</li>
        </ol>
      </div>
    </div>
  )
}