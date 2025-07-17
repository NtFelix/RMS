import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinanceShowcase from './finance-showcase';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onClick, width, height, className, priority, placeholder, blurDataURL, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        onClick={onClick}
        width={width}
        height={height}
        className={className}
        data-testid="mock-image"
        {...props}
      />
    );
  };
});

describe('FinanceShowcase', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the main section with correct heading', () => {
      render(<FinanceShowcase />);
      
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Umfassende Finanzverwaltung');
      expect(screen.getByText(/Behalten Sie den Überblick über alle Ihre Immobilienfinanzen/)).toBeInTheDocument();
    });

    it('renders all tab buttons', () => {
      render(<FinanceShowcase />);
      
      expect(screen.getByRole('tab', { name: /Dashboard Übersicht/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Charts & Analytics/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Transaktionsverwaltung/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Reporting & Export/ })).toBeInTheDocument();
    });

    it('renders the first tab as active by default', () => {
      render(<FinanceShowcase />);
      
      const dashboardTab = screen.getByRole('tab', { name: /Dashboard Übersicht/ });
      expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
      expect(dashboardTab).toHaveClass('border-primary', 'text-primary');
    });

    it('renders tab content for the active tab', () => {
      render(<FinanceShowcase />);
      
      // Check if dashboard content is displayed
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Dashboard Übersicht');
      expect(screen.getByText(/Zentrale Finanzübersicht mit wichtigen Kennzahlen/)).toBeInTheDocument();
    });
  });

  describe('Tab Content Components', () => {
    it('renders features list with checkmark icons', () => {
      render(<FinanceShowcase />);
      
      // Check for features list heading
      expect(screen.getByText('Hauptfunktionen')).toBeInTheDocument();
      
      // Check for specific features
      expect(screen.getByText('Durchschnittliche monatliche Einnahmen und Ausgaben')).toBeInTheDocument();
      expect(screen.getByText('Cashflow-Analyse und Jahresprognose')).toBeInTheDocument();
      expect(screen.getByText('Übersichtliche Kennzahlen-Karten')).toBeInTheDocument();
      expect(screen.getByText('Echtzeit-Aktualisierung der Finanzdaten')).toBeInTheDocument();
    });

    it('renders data capabilities sections', () => {
      render(<FinanceShowcase />);
      
      // Check for capability section headings
      expect(screen.getByText('Filterung')).toBeInTheDocument();
      expect(screen.getByText('Suche')).toBeInTheDocument();
      expect(screen.getByText('Tracking')).toBeInTheDocument();
      
      // Check for specific capabilities
      expect(screen.getByText('• Nach Zeitraum')).toBeInTheDocument();
      expect(screen.getByText('• Transaktionsname')).toBeInTheDocument();
      expect(screen.getByText('• Mieteinnahmen')).toBeInTheDocument();
    });

    it('renders image with correct attributes', () => {
      render(<FinanceShowcase />);
      
      const image = screen.getByTestId('mock-image');
      expect(image).toHaveAttribute('src', '/product-images/finance-page.png');
      expect(image).toHaveAttribute('alt', 'Finance Dashboard Screenshot showing summary cards and key metrics');
    });
  });

  describe('Tab Navigation', () => {
    it('switches tabs when clicked', async () => {
      render(<FinanceShowcase />);
      
      const chartsTab = screen.getByRole('tab', { name: /Charts & Analytics/ });
      fireEvent.click(chartsTab);
      
      await waitFor(() => {
        expect(chartsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Charts & Analytics');
      });
    });

    it('updates content when switching tabs', async () => {
      render(<FinanceShowcase />);
      
      // Switch to transactions tab
      const transactionsTab = screen.getByRole('tab', { name: /Transaktionsverwaltung/ });
      fireEvent.click(transactionsTab);
      
      await waitFor(() => {
        expect(screen.getByText(/Umfassende Transaktionsverwaltung mit erweiterten Filter/)).toBeInTheDocument();
        expect(screen.getByText('Detaillierte Transaktionsübersicht')).toBeInTheDocument();
      });
    });

    it('handles keyboard navigation with arrow keys', async () => {
      render(<FinanceShowcase />);
      
      const dashboardTab = screen.getByRole('tab', { name: /Dashboard Übersicht/ });
      dashboardTab.focus();
      
      // Press right arrow to move to next tab
      fireEvent.keyDown(dashboardTab, { key: 'ArrowRight' });
      
      await waitFor(() => {
        const chartsTab = screen.getByRole('tab', { name: /Charts & Analytics/ });
        expect(chartsTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('handles keyboard navigation with Home and End keys', async () => {
      render(<FinanceShowcase />);
      
      // Start from second tab
      const chartsTab = screen.getByRole('tab', { name: /Charts & Analytics/ });
      fireEvent.click(chartsTab);
      
      await waitFor(() => {
        expect(chartsTab).toHaveAttribute('aria-selected', 'true');
      });
      
      // Press Home to go to first tab
      fireEvent.keyDown(chartsTab, { key: 'Home' });
      
      await waitFor(() => {
        const dashboardTab = screen.getByRole('tab', { name: /Dashboard Übersicht/ });
        expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Image Modal', () => {
    it('does not show modal by default', () => {
      render(<FinanceShowcase />);
      
      // Modal should not be visible initially
      expect(screen.queryByText('×')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens image modal when image is clicked', () => {
      render(<FinanceShowcase />);
      
      const images = screen.getAllByTestId('mock-image');
      const tabImage = images[0]; // Get the first image (tab content image)
      fireEvent.click(tabImage);
      
      // Check if modal is displayed by looking for the modal overlay
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-image')).toHaveLength(2); // Original + modal image
    });

    it('closes image modal when close button is clicked', () => {
      render(<FinanceShowcase />);
      
      // Open modal
      const images = screen.getAllByTestId('mock-image');
      const tabImage = images[0];
      fireEvent.click(tabImage);
      
      // Close modal
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      // Modal should be closed - only one image should remain
      expect(screen.getAllByTestId('mock-image')).toHaveLength(1);
    });

    it('closes image modal when backdrop is clicked', () => {
      render(<FinanceShowcase />);
      
      // Open modal
      const images = screen.getAllByTestId('mock-image');
      const tabImage = images[0];
      fireEvent.click(tabImage);
      
      // Find and click the modal backdrop
      const modalBackdrop = screen.getByRole('button').closest('.fixed');
      if (modalBackdrop) {
        fireEvent.click(modalBackdrop);
      }
      
      // Modal should be closed
      expect(screen.getAllByTestId('mock-image')).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for tabs', () => {
      render(<FinanceShowcase />);
      
      const tabList = screen.getByRole('tablist');
      expect(tabList).toHaveAttribute('aria-label', 'Finance feature tabs');
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab, index) => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('id');
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('has proper tabpanel attributes', () => {
      render(<FinanceShowcase />);
      
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveAttribute('id');
      expect(tabPanel).toHaveAttribute('aria-labelledby');
    });

    it('manages focus correctly for keyboard navigation', () => {
      render(<FinanceShowcase />);
      
      const activeTab = screen.getByRole('tab', { selected: true });
      expect(activeTab).toHaveAttribute('tabIndex', '0');
      
      const inactiveTabs = screen.getAllByRole('tab').filter(tab => 
        tab.getAttribute('aria-selected') === 'false'
      );
      inactiveTabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabIndex', '-1');
      });
    });
  });

  describe('Content Rendering for Different Tabs', () => {
    const tabTestCases = [
      {
        tabName: 'Charts & Analytics',
        expectedHeading: 'Charts & Analytics',
        expectedDescription: /Interaktive Diagramme zeigen Einnahmen/,
        expectedFeature: 'Interaktive Einnahmen- und Ausgabendiagramme'
      },
      {
        tabName: 'Transaktionsverwaltung',
        expectedHeading: 'Transaktionsverwaltung',
        expectedDescription: /Umfassende Transaktionsverwaltung mit erweiterten/,
        expectedFeature: 'Detaillierte Transaktionsübersicht'
      },
      {
        tabName: 'Reporting & Export',
        expectedHeading: 'Reporting & Export',
        expectedDescription: /Umfassende Berichtsfunktionen und Datenexport/,
        expectedFeature: 'Automatische Finanzberichte'
      }
    ];

    tabTestCases.forEach(({ tabName, expectedHeading, expectedDescription, expectedFeature }) => {
      it(`renders correct content for ${tabName} tab`, async () => {
        render(<FinanceShowcase />);
        
        const tab = screen.getByRole('tab', { name: new RegExp(tabName) });
        fireEvent.click(tab);
        
        await waitFor(() => {
          expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(expectedHeading);
          expect(screen.getByText(expectedDescription)).toBeInTheDocument();
          expect(screen.getByText(expectedFeature)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('applies correct CSS classes for responsive design', () => {
      render(<FinanceShowcase />);
      
      // Check for responsive grid classes - mobile-first approach
      const contentGrid = screen.getByRole('tabpanel').firstChild;
      expect(contentGrid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
      
      // Check for responsive capability grid - mobile-first approach
      const capabilitiesSection = screen.getByText('Filterung').closest('.grid');
      expect(capabilitiesSection).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });
  });

  describe('Transition Effects', () => {
    it('applies transition classes during tab switching', async () => {
      render(<FinanceShowcase />);
      
      const chartsTab = screen.getByRole('tab', { name: /Charts & Analytics/ });
      fireEvent.click(chartsTab);
      
      // Check for transition classes
      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel.firstChild).toHaveClass('transition-opacity', 'duration-300');
    });
  });
});