import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MobileMoreMenu } from '../mobile-more-menu'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn()
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('MobileMoreMenu', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    currentPath: '/mieter'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/mieter')
  })

  it('renders when open', () => {
    render(<MobileMoreMenu {...defaultProps} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Weitere')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<MobileMoreMenu {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders all menu items', () => {
    render(<MobileMoreMenu {...defaultProps} />)
    
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Finanzen')).toBeInTheDocument()
    expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('shows active state for current page', () => {
    mockUsePathname.mockReturnValue('/mieter')
    render(<MobileMoreMenu {...defaultProps} />)
    
    const mieterLink = screen.getByRole('link', { name: /Navigate to Mieter/i })
    expect(mieterLink).toHaveClass('bg-blue-50', 'text-blue-700')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<MobileMoreMenu {...defaultProps} onClose={onClose} />)
    
    const closeButton = screen.getByRole('button', { name: /Menü schließen/i })
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn()
    render(<MobileMoreMenu {...defaultProps} onClose={onClose} />)
    
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('handles escape key press', () => {
    const onClose = jest.fn()
    render(<MobileMoreMenu {...defaultProps} onClose={onClose} />)
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has proper accessibility attributes', () => {
    render(<MobileMoreMenu {...defaultProps} />)
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Weitere Navigation')
  })

  it('has touch-friendly button sizes', () => {
    render(<MobileMoreMenu {...defaultProps} />)
    
    const links = screen.getAllByRole('link')
    links.forEach(link => {
      expect(link).toHaveClass('touch-manipulation')
    })
  })

  it('shows active indicator for current page', () => {
    mockUsePathname.mockReturnValue('/finanzen')
    render(<MobileMoreMenu {...defaultProps} />)
    
    const finanzenLink = screen.getByRole('link', { name: /Navigate to Finanzen/i })
    expect(finanzenLink).toHaveClass('bg-blue-50', 'text-blue-700')
    
    // Check for active indicator dot
    const activeIndicator = finanzenLink.querySelector('.bg-blue-600.rounded-full')
    expect(activeIndicator).toBeInTheDocument()
  })
})