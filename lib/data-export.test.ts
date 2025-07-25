import { exportToCSV, exportToPDF, exportTableData } from './data-export'
import { createTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table'

// Mock data for testing
interface TestData {
  id: string
  name: string
  email: string
  date: Date
  amount: number
  status: string
}

const mockData: TestData[] = [
  { 
    id: '1', 
    name: 'John Doe', 
    email: 'john@example.com', 
    date: new Date('2024-01-15'),
    amount: 1234.56,
    status: 'active' 
  },
  { 
    id: '2', 
    name: 'Jane Smith', 
    email: 'jane@example.com', 
    date: new Date('2024-02-20'),
    amount: 987.65,
    status: 'inactive' 
  },
]

const mockColumns: ColumnDef<TestData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
]

// Mock DOM methods
const mockCreateElement = jest.fn()
const mockAppendChild = jest.fn()
const mockRemoveChild = jest.fn()
const mockClick = jest.fn()
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()

// Mock Blob constructor
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as any

// Mock URL methods
global.URL = {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
} as any

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
})

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
})

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
})

// Mock jsPDF and autoTable
const mockSave = jest.fn()
const mockAutoTable = jest.fn()
const mockText = jest.fn()
const mockSetFontSize = jest.fn()
const mockSetPage = jest.fn()

jest.mock('jspdf', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    const instance = {
      save: mockSave,
      text: mockText,
      setFontSize: mockSetFontSize,
      setPage: mockSetPage,
      autoTable: mockAutoTable,
      internal: {
        getNumberOfPages: () => 1,
        pageSize: { width: 210, height: 297 },
      },
    }
    // Ensure autoTable is available on the instance
    ;(instance as any).autoTable = mockAutoTable
    return instance
  }),
}))

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  applyPlugin: jest.fn((jsPDF) => {
    if (jsPDF && jsPDF.API) {
      jsPDF.API.autoTable = mockAutoTable
    }
  }),
}))

describe('data-export', () => {
  let mockTable: any

  beforeEach(() => {
    // Create a mock table
    mockTable = createTable({
      data: mockData,
      columns: mockColumns,
      getCoreRowModel: getCoreRowModel(),
    })

    // Mock table methods
    mockTable.getAllColumns = jest.fn().mockReturnValue(
      mockColumns.map(col => ({ columnDef: col }))
    )
    mockTable.getFilteredRowModel = jest.fn().mockReturnValue({
      rows: mockData.map(data => ({ original: data }))
    })

    // Reset mocks
    jest.clearAllMocks()
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    })
    mockCreateObjectURL.mockReturnValue('mock-url')
  })

  describe('exportToCSV', () => {
    it('should export data to CSV with German formatting', async () => {
      await exportToCSV(mockTable, {
        filename: 'test-export',
        dateFormat: 'german',
        numberFormat: 'german',
      })

      // Check that Blob was created with correct content
      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('Name;Email;Date;Amount;Status')]),
        { type: 'text/csv;charset=utf-8;' }
      )

      // Check that download was triggered
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
    })

    it('should handle CSV export without headers', async () => {
      await exportToCSV(mockTable, {
        includeHeaders: false,
      })

      expect(global.Blob).toHaveBeenCalled()
      const blobContent = (global.Blob as jest.Mock).mock.calls[0][0][0]
      expect(blobContent).not.toContain('Name;Email;Date;Amount;Status')
    })

    it('should escape special characters in CSV', async () => {
      const dataWithSpecialChars = [
        { 
          id: '1', 
          name: 'John; "Doe"', 
          email: 'john@example.com', 
          date: new Date('2024-01-15'),
          amount: 1234.56,
          status: 'active\nstatus' 
        }
      ]

      mockTable.getFilteredRowModel.mockReturnValue({
        rows: dataWithSpecialChars.map(data => ({ original: data }))
      })

      await exportToCSV(mockTable)

      expect(global.Blob).toHaveBeenCalled()
      const blobContent = (global.Blob as jest.Mock).mock.calls[0][0][0]
      expect(blobContent).toContain('"John; ""Doe"""')
      expect(blobContent).toContain('active status')
    })
  })

  describe('exportToPDF', () => {
    it('should export data to PDF', async () => {
      await exportToPDF(mockTable, {
        filename: 'test-export',
      })

      // Check that jsPDF was instantiated
      const jsPDF = require('jspdf').default
      expect(jsPDF).toHaveBeenCalled()

      // Check that autoTable was called
      expect(mockAutoTable).toHaveBeenCalled()

      // Check that PDF was saved
      expect(mockSave).toHaveBeenCalledWith('test-export.pdf')
    })

    it('should add title and date to PDF', async () => {
      await exportToPDF(mockTable)

      expect(mockSetFontSize).toHaveBeenCalledWith(16)
      expect(mockText).toHaveBeenCalledWith('Datenexport', 14, 20)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Exportiert am:'),
        14,
        30
      )
    })
  })

  describe('exportTableData', () => {
    it('should handle CSV format', async () => {
      // Mock the CSV export to avoid actual file operations
      global.Blob = jest.fn().mockImplementation(() => ({})) as any
      mockCreateObjectURL.mockReturnValue('mock-url')
      
      await expect(
        exportTableData(mockTable, 'csv', { filename: 'test' })
      ).resolves.not.toThrow()
    })

    it('should handle PDF format', async () => {
      await expect(
        exportTableData(mockTable, 'pdf', { filename: 'test' })
      ).resolves.not.toThrow()
    })

    it('should throw error for unsupported format', async () => {
      await expect(
        exportTableData(mockTable, 'xml' as any, {})
      ).rejects.toThrow('Unsupported export format: xml')
    })
  })
})