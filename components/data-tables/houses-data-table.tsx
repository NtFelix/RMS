"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { FilterConfig } from "@/components/ui/data-table-toolbar"
import { housesColumns, House } from "@/components/columns/houses-columns"
import { HouseContextMenu } from "@/components/house-context-menu"
import { exportTableData, ExportOptions } from "@/lib/data-export"
import { toast } from "@/hooks/use-toast"

interface HousesDataTableProps {
  data: House[]
  onEdit: (house: House) => void
  onRefresh: () => Promise<void>
  enableSelection?: boolean
  loading?: boolean
}

export function HousesDataTable({
  data,
  onEdit,
  onRefresh,
  enableSelection = true,
  loading = false,
}: HousesDataTableProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  // Filter configuration for Houses
  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Voll belegt", value: "full" },
        { label: "Frei", value: "vacant" },
        { label: "Keine Wohnungen", value: "no-apartments" },
      ],
      type: "select",
    },
  ]

  // Custom export handler with German formatting
  const handleExport = React.useCallback(
    async (format: 'csv' | 'pdf') => {
      setIsExporting(true)
      try {
        // Create a temporary table instance for export
        const { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel } = await import("@tanstack/react-table")
        
        // We need to create a minimal table instance for export
        const exportOptions: ExportOptions = {
          filename: `haeuser_export_${new Date().toISOString().split('T')[0]}`,
          includeHeaders: true,
          dateFormat: 'german',
          numberFormat: 'german',
        }

        // For now, we'll use a simplified export approach
        // In a real implementation, you'd want to pass the actual table instance
        if (format === 'csv') {
          await exportHousesToCSV(data, exportOptions)
        } else {
          await exportHousesToPDF(data, exportOptions)
        }

        toast({
          title: "Export erfolgreich",
          description: `Häuser wurden als ${format.toUpperCase()} exportiert.`,
        })
      } catch (error) {
        console.error('Export error:', error)
        toast({
          title: "Export fehlgeschlagen",
          description: `Fehler beim Exportieren als ${format.toUpperCase()}.`,
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
      }
    },
    [data]
  )

  return (
    <DataTable
      columns={housesColumns}
      data={data}
      searchKey="name"
      searchPlaceholder="Häuser suchen..."
      enableSelection={enableSelection}
      enablePagination={true}
      enableColumnVisibility={true}
      enableExport={true}
      onRowClick={onEdit}
      contextMenuComponent={({ row, children }) => (
        <HouseContextMenu
          house={row}
          onEdit={() => onEdit(row)}
          onRefresh={onRefresh}
        >
          {children}
        </HouseContextMenu>
      )}
      filters={filters}
      onExport={handleExport}
      loading={loading}
      emptyMessage="Keine Häuser gefunden."
      className="houses-data-table"
    />
  )
}

// Simplified export functions for Houses
async function exportHousesToCSV(houses: House[], options: ExportOptions): Promise<void> {
  const headers = ["Häuser", "Ort", "Größe", "Miete", "Miete pro m²", "Status"]
  const csvData: string[][] = [headers]

  houses.forEach(house => {
    const totalApartments = house.totalApartments ?? 0
    const freeApartments = house.freeApartments ?? 0
    const occupiedApartments = totalApartments - freeApartments
    
    let status = "Keine Wohnungen"
    if (totalApartments > 0) {
      status = `${occupiedApartments}/${totalApartments} belegt`
    }

    csvData.push([
      house.name,
      house.ort,
      house.size ? `${house.size} m²` : "-",
      house.rent ? `${house.rent} €` : "-",
      house.pricePerSqm ? `${house.pricePerSqm} €/m²` : "-",
      status,
    ])
  })

  // Convert to CSV string using semicolon separator (German standard)
  const csvContent = csvData
    .map(row => 
      row.map(cell => {
        // Escape cells that contain semicolons, quotes, or line breaks
        if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(';')
    )
    .join('\n')

  // Add BOM for proper German character encoding
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  })

  // Download the file
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${options.filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function exportHousesToPDF(houses: House[], options: ExportOptions): Promise<void> {
  try {
    // Dynamic imports for PDF generation
    const { default: jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')

    // Apply the autoTable plugin
    if (autoTableModule && typeof autoTableModule.applyPlugin === 'function') {
      autoTableModule.applyPlugin(jsPDF)
    } else if (autoTableModule && typeof autoTableModule.default === 'function') {
      ;(jsPDF.API as any).autoTable = autoTableModule.default
    }

    const doc = new jsPDF()
    
    // Prepare headers
    const headers = ["Häuser", "Ort", "Größe", "Miete", "Miete pro m²", "Status"]

    // Prepare data
    const data = houses.map(house => {
      const totalApartments = house.totalApartments ?? 0
      const freeApartments = house.freeApartments ?? 0
      const occupiedApartments = totalApartments - freeApartments
      
      let status = "Keine Wohnungen"
      if (totalApartments > 0) {
        status = `${occupiedApartments}/${totalApartments} belegt`
      }

      return [
        house.name,
        house.ort,
        house.size ? `${house.size} m²` : "-",
        house.rent ? `${house.rent} €` : "-",
        house.pricePerSqm ? `${house.pricePerSqm} €/m²` : "-",
        status,
      ]
    })

    // Add title
    doc.setFontSize(16)
    doc.text('Häuser Export', 14, 20)

    // Add export date
    doc.setFontSize(10)
    doc.text(
      `Exportiert am: ${new Date().toLocaleDateString('de-DE')}`,
      14,
      30
    )

    // Add table
    ;(doc as any).autoTable({
      head: [headers],
      body: data,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 40, right: 14, bottom: 20, left: 14 },
      tableWidth: 'auto',
    })

    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(
        `Seite ${i} von ${pageCount}`,
        doc.internal.pageSize.width - 30,
        doc.internal.pageSize.height - 10
      )
    }

    // Save the PDF
    doc.save(`${options.filename}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('PDF-Export fehlgeschlagen')
  }
}