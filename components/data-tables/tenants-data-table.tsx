"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { FilterConfig } from "@/components/ui/data-table-toolbar"
import { tenantsColumns, TenantWithWohnung } from "@/components/columns/tenants-columns"
import { TenantContextMenu } from "@/components/tenant-context-menu"
import { exportTableData, ExportOptions } from "@/lib/data-export"
import { toast } from "@/hooks/use-toast"
import { Tenant } from "@/types/Tenant"

interface TenantsDataTableProps {
  data: Tenant[]
  wohnungen: { id: string; name: string }[]
  onEdit: (tenant: Tenant) => void
  onRefresh: () => Promise<void>
  enableSelection?: boolean
  loading?: boolean
}

export function TenantsDataTable({
  data,
  wohnungen,
  onEdit,
  onRefresh,
  enableSelection = true,
  loading = false,
}: TenantsDataTableProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  // Create wohnungen lookup map
  const wohnungsMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  // Transform tenant data to include apartment names and current status
  const transformedData: TenantWithWohnung[] = React.useMemo(() => {
    return data.map(tenant => {
      const today = new Date()
      const isCurrentTenant = !tenant.auszug || new Date(tenant.auszug) > today
      
      return {
        ...tenant,
        wohnungName: tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] : undefined,
        isCurrentTenant,
      }
    })
  }, [data, wohnungsMap])

  // Filter configuration for Tenants
  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { label: "Aktuelle Mieter", value: "current" },
        { label: "Ehemalige Mieter", value: "previous" },
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
        
        const exportOptions: ExportOptions = {
          filename: `mieter_export_${new Date().toISOString().split('T')[0]}`,
          includeHeaders: true,
          dateFormat: 'german',
          numberFormat: 'german',
        }

        // For now, we'll use a simplified export approach
        if (format === 'csv') {
          await exportTenantsToCSV(transformedData, exportOptions)
        } else {
          await exportTenantsToPDF(transformedData, exportOptions)
        }

        toast({
          title: "Export erfolgreich",
          description: `Mieter wurden als ${format.toUpperCase()} exportiert.`,
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
    [transformedData]
  )

  // Custom search function for multiple fields
  const searchableData = React.useMemo(() => {
    return transformedData.map(tenant => ({
      ...tenant,
      searchableText: [
        tenant.name,
        tenant.email || '',
        tenant.telefonnummer || '',
        tenant.wohnungName || '',
      ].join(' ').toLowerCase()
    }))
  }, [transformedData])

  return (
    <DataTable
      columns={tenantsColumns}
      data={searchableData}
      searchKey="searchableText"
      searchPlaceholder="Mieter suchen (Name, E-Mail, Telefon, Wohnung)..."
      enableSelection={enableSelection}
      enablePagination={true}
      enableColumnVisibility={true}
      enableExport={true}
      onRowClick={onEdit}
      contextMenuComponent={({ row, children }) => (
        <TenantContextMenu
          tenant={row}
          onEdit={() => onEdit(row)}
          onRefresh={onRefresh}
        >
          {children}
        </TenantContextMenu>
      )}
      filters={filters}
      onExport={handleExport}
      loading={loading}
      emptyMessage="Keine Mieter gefunden."
      className="tenants-data-table"
    />
  )
}

// Simplified export functions for Tenants
async function exportTenantsToCSV(tenants: TenantWithWohnung[], options: ExportOptions): Promise<void> {
  const headers = [
    "Name", 
    "E-Mail", 
    "Telefon", 
    "Wohnung", 
    "Einzug", 
    "Auszug", 
    "Status",
    "Nebenkosten (Gesamt)",
    "Kaution (Betrag)",
    "Kaution (Status)"
  ]
  const csvData: string[][] = [headers]

  tenants.forEach(tenant => {
    // Calculate total Nebenkosten
    const totalNebenkosten = tenant.nebenkosten?.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0
      return sum + amount
    }, 0) || 0

    // Format dates
    const einzugFormatted = tenant.einzug 
      ? new Date(tenant.einzug).toLocaleDateString('de-DE')
      : "-"
    const auszugFormatted = tenant.auszug 
      ? new Date(tenant.auszug).toLocaleDateString('de-DE')
      : "-"

    // Determine status
    const status = tenant.isCurrentTenant ? "Aktuell" : "Ehemalig"

    // Format Kaution
    const kautionAmount = tenant.kaution?.amount 
      ? tenant.kaution.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : "-"
    const kautionStatus = tenant.kaution?.status || "-"

    csvData.push([
      tenant.name,
      tenant.email || "-",
      tenant.telefonnummer || "-",
      tenant.wohnungName || "-",
      einzugFormatted,
      auszugFormatted,
      status,
      totalNebenkosten > 0 ? `${totalNebenkosten.toLocaleString('de-DE')} €` : "-",
      kautionAmount,
      kautionStatus,
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

async function exportTenantsToPDF(tenants: TenantWithWohnung[], options: ExportOptions): Promise<void> {
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
    const headers = [
      "Name", 
      "E-Mail", 
      "Telefon", 
      "Wohnung", 
      "Einzug", 
      "Auszug", 
      "Status"
    ]

    // Prepare data
    const data = tenants.map(tenant => {
      const einzugFormatted = tenant.einzug 
        ? new Date(tenant.einzug).toLocaleDateString('de-DE')
        : "-"
      const auszugFormatted = tenant.auszug 
        ? new Date(tenant.auszug).toLocaleDateString('de-DE')
        : "-"
      const status = tenant.isCurrentTenant ? "Aktuell" : "Ehemalig"

      return [
        tenant.name,
        tenant.email || "-",
        tenant.telefonnummer || "-",
        tenant.wohnungName || "-",
        einzugFormatted,
        auszugFormatted,
        status,
      ]
    })

    // Add title
    doc.setFontSize(16)
    doc.text('Mieter Export', 14, 20)

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
      columnStyles: {
        0: { cellWidth: 30 }, // Name
        1: { cellWidth: 35 }, // E-Mail
        2: { cellWidth: 25 }, // Telefon
        3: { cellWidth: 25 }, // Wohnung
        4: { cellWidth: 20 }, // Einzug
        5: { cellWidth: 20 }, // Auszug
        6: { cellWidth: 20 }, // Status
      },
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