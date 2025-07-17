'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

// TypeScript interfaces for the component
interface FinanceTab {
  id: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  features: string[];
  dataCapabilities: {
    filtering: string[];
    searching: string[];
    tracking: string[];
  };
}

interface FinanceShowcaseProps {
  // No props needed - static showcase content
}

interface FinanceShowcaseState {
  activeTab: string;
  selectedImage: {
    src: string;
    alt: string;
    title: string;
  } | null;
}

// Tab data structure and configuration
const financeTabsData: FinanceTab[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Übersicht',
    description: 'Zentrale Finanzübersicht mit wichtigen Kennzahlen und Echtzeit-Aktualisierung der Finanzdaten',
    image: '/product-images/finance-page.png',
    imageAlt: 'Finance Dashboard Screenshot showing summary cards and key metrics',
    features: [
      'Durchschnittliche monatliche Einnahmen und Ausgaben',
      'Cashflow-Analyse und Jahresprognose',
      'Übersichtliche Kennzahlen-Karten',
      'Echtzeit-Aktualisierung der Finanzdaten'
    ],
    dataCapabilities: {
      filtering: ['Nach Zeitraum', 'Nach Wohnung', 'Nach Transaktionstyp'],
      searching: ['Transaktionsname', 'Notizen', 'Betrag'],
      tracking: ['Mieteinnahmen', 'Betriebskosten', 'Instandhaltung', 'Steuern']
    }
  },
  {
    id: 'charts',
    title: 'Charts & Analytics',
    description: 'Interaktive Diagramme zeigen Einnahmen-/Ausgabentrends und Verteilungen für bessere Finanzanalyse',
    image: '/product-images/finance-page.png',
    imageAlt: 'Finance Charts showing income and expense trends with interactive analytics',
    features: [
      'Interaktive Einnahmen- und Ausgabendiagramme',
      'Monatliche und jährliche Trendanalysen',
      'Kategoriebasierte Ausgabenverteilung',
      'Vergleichsanalysen zwischen Zeiträumen'
    ],
    dataCapabilities: {
      filtering: ['Nach Kategorie', 'Nach Zeitraum', 'Nach Wohnung'],
      searching: ['Transaktionskategorien', 'Zeiträume', 'Beträge'],
      tracking: ['Trendentwicklung', 'Kategorieverteilung', 'Jahresvergleiche']
    }
  },
  {
    id: 'transactions',
    title: 'Transaktionsverwaltung',
    description: 'Umfassende Transaktionsverwaltung mit erweiterten Filter- und Suchfunktionen',
    image: '/product-images/finance-page.png',
    imageAlt: 'Transaction management table with filtering and search capabilities',
    features: [
      'Detaillierte Transaktionsübersicht',
      'Erweiterte Filter- und Suchoptionen',
      'Bulk-Bearbeitung von Transaktionen',
      'Automatische Kategorisierung'
    ],
    dataCapabilities: {
      filtering: ['Nach Datum', 'Nach Kategorie', 'Nach Betrag', 'Nach Status'],
      searching: ['Beschreibung', 'Referenznummer', 'Notizen'],
      tracking: ['Einzeltransaktionen', 'Wiederkehrende Zahlungen', 'Ausstehende Beträge']
    }
  },
  {
    id: 'reporting',
    title: 'Reporting & Export',
    description: 'Umfassende Berichtsfunktionen und Datenexport-Optionen für Steuerberater und Buchhaltung',
    image: '/product-images/finance-page.png',
    imageAlt: 'Financial reporting interface with export options',
    features: [
      'Automatische Finanzberichte',
      'PDF- und CSV-Export-Funktionen',
      'Steuerrelevante Zusammenfassungen',
      'Anpassbare Berichtszeiträume'
    ],
    dataCapabilities: {
      filtering: ['Nach Berichtszeitraum', 'Nach Steuerrelevanz', 'Nach Kategorie'],
      searching: ['Berichtstypen', 'Exportformate', 'Zeiträume'],
      tracking: ['Jahresabschlüsse', 'Steuerberichte', 'Cashflow-Statements']
    }
  }
];

// Tab Content Component for displaying individual tab information
interface TabContentProps {
  tab: FinanceTab;
  isTransitioning: boolean;
  onImageClick: (image: { src: string; alt: string; title: string }) => void;
}

function TabContent({ tab, isTransitioning, onImageClick }: TabContentProps) {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 items-center transition-opacity duration-300 ease-in-out ${
      isTransitioning ? 'opacity-50' : 'opacity-100'
    }`}>
      {/* Content Side */}
      <div className={`space-y-8 transform transition-all duration-300 ease-in-out ${
        isTransitioning ? 'translate-y-2' : 'translate-y-0'
      }`}>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {tab.title}
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            {tab.description}
          </p>
        </div>

        {/* Features List */}
        <FeaturesList features={tab.features} />

        {/* Data Capabilities */}
        <DataCapabilities capabilities={tab.dataCapabilities} />
      </div>

      {/* Image Side */}
      <TabImage 
        tab={tab} 
        onImageClick={onImageClick}
      />
    </div>
  );
}

// Features List Component
interface FeaturesListProps {
  features: string[];
}

function FeaturesList({ features }: FeaturesListProps) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Hauptfunktionen
      </h4>
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Data Capabilities Component
interface DataCapabilitiesProps {
  capabilities: {
    filtering: string[];
    searching: string[];
    tracking: string[];
  };
}

function DataCapabilities({ capabilities }: DataCapabilitiesProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <h5 className="font-semibold text-gray-900 mb-2">Filterung</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          {capabilities.filtering.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="font-semibold text-gray-900 mb-2">Suche</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          {capabilities.searching.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h5 className="font-semibold text-gray-900 mb-2">Tracking</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          {capabilities.tracking.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Tab Image Component with Next.js Image optimization
interface TabImageProps {
  tab: FinanceTab;
  onImageClick: (image: { src: string; alt: string; title: string }) => void;
}

function TabImage({ tab, onImageClick }: TabImageProps) {
  return (
    <div className="relative">
      <div className="relative rounded-lg overflow-hidden shadow-2xl">
        <Image
          src={tab.image}
          alt={tab.imageAlt}
          width={600}
          height={400}
          className="w-full h-auto object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => onImageClick({
            src: tab.image,
            alt: tab.imageAlt,
            title: tab.title
          })}
          priority={false}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
      </div>
    </div>
  );
}

// Tab Button Component with enhanced styling and accessibility
interface TabButtonProps {
  tab: FinanceTab;
  isActive: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabIndex: number;
}

function TabButton({ tab, isActive, onClick, onKeyDown, tabIndex }: TabButtonProps) {
  return (
    <button
      key={tab.id}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${tab.id}`}
      id={`tab-${tab.id}`}
      tabIndex={isActive ? 0 : -1}
      className={`
        relative px-6 py-3 text-sm font-medium border-b-2 transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white
        ${isActive
          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
        }
      `}
    >
      <span className="relative z-10">{tab.title}</span>
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-50 rounded-t-md transition-opacity duration-300" />
      )}
    </button>
  );
}

export default function FinanceShowcase({}: FinanceShowcaseProps) {
  // Component state management for active tab tracking
  const [activeTab, setActiveTab] = useState<string>(financeTabsData[0].id);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  
  // Refs for keyboard navigation
  const tabListRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get the currently active tab data
  const currentTab = financeTabsData.find(tab => tab.id === activeTab) || financeTabsData[0];

  // Tab switching logic with smooth transitions
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    
    setIsTransitioning(true);
    
    // Smooth transition effect
    setTimeout(() => {
      setActiveTab(tabId);
      setIsTransitioning(false);
    }, 150);
  };

  // Keyboard navigation support for accessibility
  const handleKeyDown = (e: React.KeyboardEvent, currentTabId: string) => {
    const currentIndex = financeTabsData.findIndex(tab => tab.id === currentTabId);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : financeTabsData.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < financeTabsData.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = financeTabsData.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleTabChange(currentTabId);
        return;
      default:
        return;
    }

    const newTabId = financeTabsData[newIndex].id;
    handleTabChange(newTabId);
    
    // Focus the new tab button
    setTimeout(() => {
      const newTabButton = document.getElementById(`tab-${newTabId}`);
      newTabButton?.focus();
    }, 200);
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Umfassende Finanzverwaltung
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Behalten Sie den Überblick über alle Ihre Immobilienfinanzen mit leistungsstarken 
            Analyse- und Tracking-Tools
          </p>
        </div>

        {/* Tab Navigation */}
        <div 
          ref={tabListRef}
          role="tablist" 
          aria-label="Finance feature tabs"
          className="flex flex-wrap justify-center mb-12 border-b border-gray-200"
        >
          {financeTabsData.map((tab, index) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div 
          ref={contentRef}
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          <TabContent 
            tab={currentTab}
            isTransitioning={isTransitioning}
            onImageClick={setSelectedImage}
          />
        </div>
      </div>

      {/* Image Modal (placeholder for future implementation) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={selectedImage.src}
              alt={selectedImage.alt}
              width={800}
              height={600}
              className="w-full h-auto object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}