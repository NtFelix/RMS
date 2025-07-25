"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/data-table"
import { FilterConfig } from "@/components/ui/data-table-toolbar"
import { financesColumns, Finance } from "@/components/columns/finances-columns"
import { FinanceContextMenu } from "@/components/finance-context-menu"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface FinancesDataTableProps {
  data: Finance[]
  onEdit: (finance: Finance) => void
  onRefresh: () => Promise<void>
  enableSelection?: boolean
  loading?: boolean
}

export function FinancesDataTable({
  data,
  onEdit,
  onRefresh,
  enableSelection = true,
  loading = false,
}: FinancesDataTableProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  // Get unique apartments for filtering
  const apartments = React.useMemo(() => {
    const uniqueApartments = new Set(
      data
        .filter(f => f.Wohnungen?.name)
        .map(f => f.Wohnungen!.name)
    )
    return Array.from(uniqueApartments).sort()
  }, [data])

  // Get unique years for filtering
  const years = React.useMemo(() => {
    const uniqueYears = new Set(
      data
        .filter(f => f.datum)
        .map(f => f.datum!.split("-")[0])
    )
    return Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a))
  }, [data])

  // Filter configuration for Finances
  const filters: FilterConfig[] = [
    {
      key: "apartment",
      label: "Wohnung",
      options: [
        { label: "Alle Wohnungen", value: "all" },
        ...apartments.map(apartment => ({
          label: apartment,
          value: apartment,
        })),
      ],
      type: "select",
    },
    {
      key: "type",
      label: "Transaktionstyp",
      options: [
        { label: "Alle Transaktionen", value: "all" },
        { label: "Einnahme", value: "income" },
        { label: "Ausgabe", value: "expense" },
      ],
      type: "select",
    },
    ...(years.length > 0 ? [{
      key: "year",
      label: "Jahr",
      options: [
        { label: "Alle Jahre", value: "all" },
        ...years.map(year => ({
          label: year,
          value: year,
        })),
      ],
      type: "select" as const,
    }] : []),
  ]

  // Calculate balance for current filtered data
  const calculateBalance = React.useCallback((finances: Finance[]) => {
    return finances.reduce((total, transaction) => {
      const amount = Number(transaction.betrag) || 0
      return transaction.ist_einnahmen ? total + amount : total - amount
    }, 0)
  }, [])

  // Format currency in German locale
  const formatGermanCurrency = React.useCallback((amount: number): string => {
    return amount.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " €"
  }, [])

  // Custom export handler with German formatting
  const handleExport = React.useCallback(
    async (format: 'csv' | 'pdf') => {
      setIsExporting(true)
      try {
        if (format === 'csv') {
          await exportFinancesToCSV(data)
        } else {
          await exportFinancesToPDF(data)
        }

        toast({
          title: "Export erfolgreich",
          description: `Finanzen wurden als ${format.toUpperCase()} exportiert.`,
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

  // Handle status toggle for transactions
  const handleStatusToggle = React.useCallback(
    async (finance: Finance) => {
      try {
        const response = await fetch(`/api/finanzen/${finance.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            ist_einnahmen: !finance.ist_einnahmen 
          }),
        })
        
        if (!response.ok) {
          throw new Error("Fehler beim Umschalten des Status")
        }
        
        toast({
          title: "Status geändert",
          description: `Die Transaktion wurde als ${!finance.ist_einnahmen ? "Einnahme" : "Ausgabe"} markiert.`,
        })
        
        // Refresh data
        await onRefresh()
      } catch (error) {
        console.error("Fehler beim Umschalten des Status:", error)
        toast({
          title: "Fehler",
          description: "Der Status konnte nicht geändert werden.",
          variant: "destructive",
        })
      }
    },
    [onRefresh]
  )

  // Calculate current balance for display
  const currentBalance = React.useMemo(() => {
    return calculateBalance(data)
  }, [data, calculateBalance])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finanzliste</CardTitle>
        <CardDescription>Übersicht aller Einnahmen und Ausgaben</CardDescription>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Saldo</div>
          <div className={`text-xl font-bold ${
            currentBalance >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {formatGermanCurrency(currentBalance)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={financesColumns}
          data={data}
          searchKey="name"
          searchPlaceholder="Transaktionen suchen..."
          enableSelection={enableSelection}
          enablePagination={true}
          enableColumnVisibility={true}
          enableExport={true}
          onRowClick={onEdit}
          contextMenuComponent={({ row, children }) => (
            <FinanceContextMenu
              finance={row}
              onEdit={() => onEdit(row)}
              onStatusToggle={() => handleStatusToggle(row)}
              onRefresh={onRefresh}
            >
              {children}
            </FinanceContextMenu>
          )}
          filters={filters}
          onExport={handleExport}
          loading={loading}
          emptyMessage="Keine Transaktionen gefunden."
          className="finances-data-table"
        />
      </CardContent>
    </Card>
  )
}

// Export functions for Finances
async function exportFinancesToCSV(finances: Finance[]): Promise<void> {
  const headers = ["Bezeichnung", "Wohnung", "Datum", "Betrag", "Typ", "Notiz"]
  const csvData: string[][] = [headers]

  finances.forEach(finance => {
    const formatGermanDate = (dateString: string | null | undefined): string => {
      if (!dateString) return "-"
      const date = new Date(dateString)
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    const formatGermanCurrency = (amount: number): string => {
      return amount.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    csvData.push([
      finance.name,
      finance.Wohnungen?.name || "-",
      formatGermanDate(finance.datum),
      formatGermanCurrency(finance.betrag),
      finance.ist_einnahmen ? "Einnahme" : "Ausgabe",
      finance.notiz || "-",
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
  link.download = `finanzen_export_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function exportFinancesToPDF(finances: Finance[]): Promise<void> {
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
    
    // Helper functions
    const formatGermanDate = (dateString: string | null | undefined): string => {
      if (!dateString) return "-"
      const date = new Date(dateString)
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    const formatGermanCurrency = (amount: number): string => {
      return amount.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + " €"
    }

    // Prepare headers
    const headers = ["Bezeichnung", "Wohnung", "Datum", "Betrag", "Typ"]

    // Prepare data
    const data = finances.map(finance => [
      finance.name,
      finance.Wohnungen?.name || "-",
      formatGermanDate(finance.datum),
      formatGermanCurrency(finance.betrag),
      finance.ist_einnahmen ? "Einnahme" : "Ausgabe",
    ])

    // Calculate total balance
    const totalBalance = finances.reduce((total, transaction) => {
      const amount = Number(transaction.betrag) || 0
      return transaction.ist_einnahmen ? total + amount : total - amount
    }, 0)

    // Add title
    doc.setFontSize(16)
    doc.text('Finanzen Export', 14, 20)

    // Add export date and balance
    doc.setFontSize(10)
    doc.text(
      `Exportiert am: ${new Date().toLocaleDateString('de-DE')}`,
      14,
      30
    )
    doc.text(
      `Gesamtsaldo: ${formatGermanCurrency(totalBalance)}`,
      14,
      36
    )

    // Add table
    ;(doc as any).autoTable({
      head: [headers],
      body: data,
      startY: 45,
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
      columnStyles: {
        3: { halign: 'right' }, // Amount column right-aligned
      },
      margin: { top: 45, right: 14, bottom: 20, left: 14 },
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
    doc.save(`finanzen_export_${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('PDF-Export fehlgeschlagen')
  }
}