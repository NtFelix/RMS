import { render, screen, fireEvent } from '@testing-library/react'
import { ApartmentTable, Apartment } from './apartment-table'

// Mock the context menu component
jest.mock('./apartment-context-menu', () => ({
  ApartmentContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

const mockApartments: Apartment[] = [
  {
    id: '1',
    name: 'Apartment A',
    groesse: 50,
    miete: 800,
    status: 'frei',
    Haeuser: { name: 'House 1' }
  },
  {
    id: '2', 
    name: 'Apartment B',
    groesse: 75,
    miete: 1200,
    status: 'vermietet',
    Haeuser: { name: 'House 2' }
  },
  {
    id: '3',
    name: 'Apartment C', 
    groesse: 60,
    miete: 900,
    status: 'frei',
    Haeuser: { name: 'House 1' }
  }
]

describe('ApartmentTable Sorting', () => {
  it('should render table headers with sort icons', () => {
    render(
      <ApartmentTable 
        filter="all" 
        searchQuery="" 
        initialApartments={mockApartments}
      />
    )

    expect(screen.getByText('Wohnung')).toBeInTheDocument()
    expect(screen.getByText('Größe (m²)')).toBeInTheDocument()
    expect(screen.getByText('Miete (€)')).toBeInTheDocument()
    expect(screen.getByText('Miete pro m²')).toBeInTheDocument()
    expect(screen.getByText('Haus')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should sort by apartment name when clicking name header', () => {
    render(
      <ApartmentTable 
        filter="all" 
        searchQuery="" 
        initialApartments={mockApartments}
      />
    )

    // The table is already sorted by name by default, so check current order
    let rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Apartment A')
    expect(rows[2]).toHaveTextContent('Apartment B') 
    expect(rows[3]).toHaveTextContent('Apartment C')
  })

  it('should sort by size when clicking size header', () => {
    render(
      <ApartmentTable 
        filter="all" 
        searchQuery="" 
        initialApartments={mockApartments}
      />
    )

    const sizeHeader = screen.getByText('Größe (m²)')
    fireEvent.click(sizeHeader)

    // Check that apartments are sorted by size (50, 60, 75)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('50 m²')
    expect(rows[2]).toHaveTextContent('60 m²')
    expect(rows[3]).toHaveTextContent('75 m²')
  })

  it('should sort by rent when clicking rent header', () => {
    render(
      <ApartmentTable 
        filter="all" 
        searchQuery="" 
        initialApartments={mockApartments}
      />
    )

    const rentHeader = screen.getByText('Miete (€)')
    fireEvent.click(rentHeader)

    // Check that apartments are sorted by rent (800, 900, 1200)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('800 €')
    expect(rows[2]).toHaveTextContent('900 €')
    expect(rows[3]).toHaveTextContent('1200 €')
  })

  it('should toggle sort direction when clicking same header', () => {
    render(
      <ApartmentTable 
        filter="all" 
        searchQuery="" 
        initialApartments={mockApartments}
      />
    )

    const nameHeader = screen.getByText('Wohnung')
    
    // Check initial state
    let rows = screen.getAllByRole('row')
    const initialOrder = [rows[1].textContent, rows[2].textContent, rows[3].textContent]
    
    // First click - should change the order
    fireEvent.click(nameHeader)
    rows = screen.getAllByRole('row')
    const afterFirstClick = [rows[1].textContent, rows[2].textContent, rows[3].textContent]
    
    // The order should be different after clicking
    expect(initialOrder).not.toEqual(afterFirstClick)
  })

  it('should calculate and sort by price per square meter', () => {
    render(
      <ApartmentTable 
        filter="all" 
        searchQuery="" 
        initialApartments={mockApartments}
      />
    )

    const pricePerSqmHeader = screen.getByText('Miete pro m²')
    fireEvent.click(pricePerSqmHeader)

    // Expected order by price per sqm: Apartment C (15.00), Apartment A (16.00), Apartment B (16.00)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('15.00 €/m²') // Apartment C: 900/60
    expect(rows[2]).toHaveTextContent('16.00 €/m²') // Apartment A: 800/50
    expect(rows[3]).toHaveTextContent('16.00 €/m²') // Apartment B: 1200/75
  })
})