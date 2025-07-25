import { ColumnDef, Table } from '@tanstack/react-table'

export interface ExportOptions {
  filename?: string
  includeHeaders?: boolean
  dateFormat?: 'german' | 'iso'
  numberFormat?: 'german' | 'us'
}

/**
 * Formats a value for export based on its type and locale preferences
 */
function formatValueForExport(
  value: any, 
  options: ExportOptions = {}
): string {
  if (value === null || value === undefined) {
    return ''
  }

  // Handle dates
  if (value instanceof Date) {
    if (options.dateFormat === 'german') {
      return value.toLocaleDateString('de-DE')
    }
    return value.toISOString().split('T')[0]
  }

  // Handle numbers
  if (typeof value === 'number') {
    if (options.numberFormat === 'german') {
      return value.toLocaleString('de-DE')
    }
    return value.toString()
  }

  // Handle strings - remove any CSV-breaking characters
  if (typeof value === 'string') {
    // Remove line breaks and normalize whitespace
    return value.replace(/[\r\n]+/g, ' ').trim()
  }

  // Handle objects/arrays by converting to string
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Extracts column headers from column definitions
 */
function getColumnHeaders<TData>(columns: ColumnDef<TData>[]): string[] {
  return columns
    .filter(col => col.id !== 'select' && col.id !== 'actions')
    .map(col => {
      if (typeof col.header === 'string') {
        return col.header
      }
      if (col.id) {
        return col.id
      }
      if ('accessorKey' in col && typeof col.accessorKey === 'string') {
        return col.accessorKey
      }
      return 'Column'
    })
}

/**
 * Extracts data values from table rows based on column definitions
 */
function getRowData<TData>(
  row: TData,
  columns: ColumnDef<TData>[],
  options: ExportOptions = {}
): string[] {
  return columns
    .filter(col => col.id !== 'select' && col.id !== 'actions')
    .map(col => {
      let value: any

      // Try to get value using accessorKey
      if ('accessorKey' in col && typeof col.accessorKey === 'string') {
        value = (row as any)[col.accessorKey]
      }
      // Try to get value using accessorFn
      else if ('accessorFn' in col && typeof col.accessorFn === 'function') {
        value = col.accessorFn(row, 0)
      }
      // Fallback to undefined
      else {
        value = undefined
      }

      return formatValueForExport(value, options)
    })
}

/**
 * Exports table data to CSV format
 */
export async function exportToCSV<TData>(
  table: Table<TData>,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'export.csv',
    includeHeaders = true,
    dateFormat = 'german',
    numberFormat = 'german'
  } = options

  const exportOptions = { dateFormat, numberFormat }
  const columns = table.getAllColumns().map(col => col.columnDef)
  const rows = table.getFilteredRowModel().rows.map(row => row.original)

  const csvData: string[][] = []

  // Add headers if requested
  if (includeHeaders) {
    csvData.push(getColumnHeaders(columns))
  }

  // Add data rows
  rows.forEach(row => {
    csvData.push(getRowData(row, columns, exportOptions))
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
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports table data to PDF format
 */
export async function exportToPDF<TData>(
  table: Table<TData>,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'export.pdf',
    includeHeaders = true,
    dateFormat = 'german',
    numberFormat = 'german'
  } = options

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
    const exportOptions = { dateFormat, numberFormat }
    const columns = table.getAllColumns().map(col => col.columnDef)
    const rows = table.getFilteredRowModel().rows.map(row => row.original)

    // Prepare headers
    const headers = includeHeaders ? getColumnHeaders(columns) : []

    // Prepare data
    const data = rows.map(row => getRowData(row, columns, exportOptions))

    // Add title
    doc.setFontSize(16)
    doc.text('Datenexport', 14, 20)

    // Add export date
    doc.setFontSize(10)
    doc.text(
      `Exportiert am: ${new Date().toLocaleDateString('de-DE')}`,
      14,
      30
    )

    // Add table
    ;(doc as any).autoTable({
      head: includeHeaders ? [headers] : [],
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
        // Auto-adjust column widths
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
    const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    doc.save(pdfFilename)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('PDF-Export fehlgeschlagen')
  }
}

/**
 * Generic export function that handles both CSV and PDF
 */
export async function exportTableData<TData>(
  table: Table<TData>,
  format: 'csv' | 'pdf',
  options: ExportOptions = {}
): Promise<void> {
  if (format === 'csv') {
    return exportToCSV(table, options)
  } else if (format === 'pdf') {
    return exportToPDF(table, options)
  } else {
    throw new Error(`Unsupported export format: ${format}`)
  }
}