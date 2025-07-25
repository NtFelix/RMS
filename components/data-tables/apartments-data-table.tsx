"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { FilterConfig } from "@/components/ui/data-table-toolbar"
import { apartmentsColumns, Apartment } from "@/components/columns/apartments-columns"
import { ApartmentContextMenu } from "@/components/apartment-context-menu"
import { ExportOptions } from "@/lib/data-export"
import { toast } from "@/hooks/use-toast"

interface ApartmentsDataTableProps {
  data: Apartment[]
  onEdit: (apartment: Apartment) => void
  onRefresh: () => Promise<void>
  enableSelection?: boolean
  loading?: boolean
}

export function ApartmentsDataTable({
  data,
  onEdit,
  onRefresh,
  enableSelection = true,
  loading = false,
}: ApartmentsDataTableProps) {
  const [, setIsExporting] = React.useState(false)

  // Filter configuration for Apartments
  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Frei", value: "free" },
        { label: "Vermietet", value: "rented" },
      ],
      type: "select",
    },
  ]

  // Custom export handler with German formatting
  const handleExport = React.useCallback(
    async (format: 'csv' | 'pdf') => {
      setIsExporting(true)
      try {
        const exportOptions: ExportOptions = {
          filename: `wohnungen_export_${new Date().toISOString().split('T')[0]}`,
          includeHeaders: true,
          dateFormat: 'german',
          numberFormat: 'german',
        }

        if (format === 'csv') {
          await exportApartmentsToCSV(data, exportOptions)
        } else {
          await exportApartmentsToPDF(data, exportOptions)
        }

        toast({
          title: "Export erfolgreich",
          description: `Wohnungen wurden als ${format.toUpperCase()} exportiert.`,
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
      columns={apartmentsColumns}
      data={data}
      searchKey="name"
      searchPlaceholder="Wohnungen suchen..."
      enableSelection={enableSelection}
      enablePagination={true}
      enableColumnVisibility={true}
      enableExport={true}
      onRowClick={onEdit}
      contextMenuComponent={({ row, children }) => (
        <ApartmentContextMenu
          apartment={row}
          onEdit={() => onEdit(row)}
          onRefresh={onRefresh}
        >
          {children}
        </ApartmentContextMenu>
      )}
      filters={filters}
      onExport={handleExport}
      loading={loading}
      emptyMessage="Keine Wohnungen gefunden."
      className="apartments-data-table"
    />
  )
}

// Export functions for Apartments
async function exportApartmentsToCSV(apartments: Apartment[], options: ExportOptions): Promise<void> {
  const headers = ["Wohnung", "Größe", "Miete", "Miete pro m²", "Haus", "Mieter", "Status"]
  const csvData: string[][] = [headers]

  apartments.forEach(apartment => {
    const pricePerSqm = (apartment.miete / apartment.groesse).toFixed(2)
    const tenantInfo = apartment.status === 'vermietet' && apartment.tenant 
      ? apartment.tenant.name 
      : "-"

    csvData.push([
      apartment.name,
      `${apartment.groesse} m²`,
      `${apartment.miete} €`,
      `${pricePerSqm} €/m²`,
      apartment.Haeuser?.name || "-",
      tenantInfo,
      apartment.status,
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

async function exportApartmentsToPDF(apartments: Apartment[], options: ExportOptions): Promise<void> {
  try {
    // Dynamic imports for PDF generation
    const { default: jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')

    // Apply the autoTable plugin
    if (autoTableModule && typeof autoTableModule.applyPlugin === 'function') {
      autoTableModule.applyPlugin(jsPDF)
    } else if (autoTableModule && typeof autoTableModule.default === 'function') {
      ;(jsPDF.API as unknown as { autoTable: typeof autoTableModule.default }).autoTable = autoTableModule.default
    }

    const doc = new jsPDF()
    
    // Prepare headers
    const headers = ["Wohnung", "Größe", "Miete", "Miete pro m²", "Haus", "Mieter", "Status"]

    // Prepare data
    const data = apartments.map(apartment => {
      const pricePerSqm = (apartment.miete / apartment.groesse).toFixed(2)
      const tenantInfo = apartment.status === 'vermietet' && apartment.tenant 
        ? apartment.tenant.name 
        : "-"

      return [
        apartment.name,
        `${apartment.groesse} m²`,
        `${apartment.miete} €`,
        `${pricePerSqm} €/m²`,
        apartment.Haeuser?.name || "-",
        tenantInfo,
        apartment.status,
      ]
    })

    // Add title
    doc.setFontSize(16)
    doc.text('Wohnungen Export', 14, 20)

    // Add export date
    doc.setFontSize(10)
    doc.text(
      `Exportiert am: ${new Date().toLocaleDateString('de-DE')}`,
      14,
      30
    )

    // Add table
    ;(doc as unknown as { autoTable: (options: unknown) => void }).autoTable({
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
    const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
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