'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
  onImageClick: (image: { src: string; alt: string; title: string }) => void;
}

function TabContent({ tab, onImageClick }: TabContentProps) {
  return (
    <motion.div 
      key={tab.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.4, 0.0, 0.2, 1],
        staggerChildren: 0.1
      }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center"
    >
      {/* Image Side - Show first on mobile */}
      <motion.div 
        className="order-1 lg:order-2"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <TabImage 
          tab={tab} 
          onImageClick={onImageClick}
        />
      </motion.div>

      {/* Content Side - Show second on mobile */}
      <motion.div 
        className="order-2 lg:order-1 space-y-6 lg:space-y-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 lg:mb-4">
            {tab.title}
          </h3>
          <p className="text-base lg:text-lg text-muted-foreground mb-4 lg:mb-6 leading-relaxed">
            {tab.description}
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <FeaturesList features={tab.features} />
        </motion.div>

        {/* Data Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <DataCapabilities capabilities={tab.dataCapabilities} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Features List Component
interface FeaturesListProps {
  features: string[];
}

function FeaturesList({ features }: FeaturesListProps) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-foreground mb-4">
        Hauptfunktionen
      </h4>
      <ul className="space-y-3">
        {features.map((feature, index) => (
          <motion.li 
            key={index} 
            className="flex items-start group"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              ease: "easeOut"
            }}
            whileHover={{ x: 4 }}
          >
            <motion.svg
              className="h-6 w-6 text-primary mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1 + 0.2,
                type: "spring",
                stiffness: 200
              }}
              whileHover={{ scale: 1.1 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
            <span className="text-foreground/90 group-hover:text-foreground transition-colors duration-200">
              {feature}
            </span>
          </motion.li>
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
  const sections = [
    { title: 'Filterung', items: capabilities.filtering },
    { title: 'Suche', items: capabilities.searching },
    { title: 'Tracking', items: capabilities.tracking }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {sections.map((section, sectionIndex) => (
        <motion.div 
          key={section.title}
          className={sectionIndex === 2 ? "sm:col-span-2 lg:col-span-1" : ""}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.4, 
            delay: sectionIndex * 0.1,
            ease: "easeOut"
          }}
          whileHover={{ y: -2 }}
        >
          <motion.h5 
            className="font-semibold text-foreground mb-2 text-sm sm:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: sectionIndex * 0.1 + 0.2 }}
          >
            {section.title}
          </motion.h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            {section.items.map((item, index) => (
              <motion.li 
                key={index} 
                className="leading-relaxed hover:text-foreground transition-colors duration-200"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: sectionIndex * 0.1 + index * 0.05 + 0.3,
                  ease: "easeOut"
                }}
                whileHover={{ x: 2 }}
              >
                • {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      ))}
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
    <motion.div 
      className="relative group"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div 
        className="relative rounded-lg overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl"
        whileHover={{ 
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          scale: 1.02
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Image
            src={tab.image}
            alt={tab.imageAlt}
            width={600}
            height={400}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
            className="w-full h-auto object-cover cursor-pointer touch-manipulation"
            onClick={() => onImageClick({
              src: tab.image,
              alt: tab.imageAlt,
              title: tab.title
            })}
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </motion.div>
        
        {/* Enhanced hover overlay */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div 
            className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            whileHover={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Subtle glow effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
        />
      </motion.div>
    </motion.div>
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
    <motion.button
      key={tab.id}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${tab.id}`}
      id={`tab-${tab.id}`}
      tabIndex={isActive ? 0 : -1}
      className={`
        relative px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 
        transition-all duration-300 ease-in-out min-h-[44px] touch-manipulation
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
        ${isActive
          ? 'border-primary text-primary bg-primary/10'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 active:bg-muted'
        }
      `}
      whileHover={{ 
        y: -2,
        scale: 1.02
      }}
      whileTap={{ 
        scale: 0.98,
        y: 0
      }}
      transition={{ 
        duration: 0.2, 
        ease: "easeOut" 
      }}
    >
      <motion.span 
        className="relative z-10 whitespace-nowrap"
        animate={{ 
          color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' 
        }}
        transition={{ duration: 0.2 }}
      >
        {tab.title}
      </motion.span>
      
      <AnimatePresence>
        {isActive && (
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-50 rounded-t-md"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.5, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ originX: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Active tab indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Hover effect */}
      <motion.div
        className="absolute inset-0 bg-primary/5 rounded-t-md opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
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
  
  // Refs for keyboard navigation
  const tabListRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get the currently active tab data
  const currentTab = financeTabsData.find(tab => tab.id === activeTab) || financeTabsData[0];

  // Tab switching logic with Framer Motion animations
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
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
    <section className="py-24 px-4 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Umfassende Finanzverwaltung
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Behalten Sie den Überblick über alle Ihre Immobilienfinanzen mit leistungsstarken 
            Analyse- und Tracking-Tools
          </p>
        </div>

        {/* Tab Navigation */}
        <div 
          ref={tabListRef}
          role="tablist" 
          aria-label="Finance feature tabs"
          className="flex flex-wrap justify-center mb-8 sm:mb-12 border-b border-border overflow-x-auto scrollbar-hide"
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
          <AnimatePresence mode="wait">
            <TabContent 
              key={activeTab}
              tab={currentTab}
              onImageClick={setSelectedImage}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced Image Modal with animations */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setSelectedImage(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="relative w-full h-full max-w-6xl max-h-full flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0.0, 0.2, 1] 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Image
                  src={selectedImage.src}
                  alt={selectedImage.alt}
                  width={800}
                  height={600}
                  sizes="(max-width: 640px) 95vw, (max-width: 1024px) 90vw, 80vw"
                  className="w-full h-auto max-h-full object-contain rounded-lg shadow-2xl"
                />
              </motion.div>
              
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white bg-black bg-opacity-50 rounded-full p-2 sm:p-3 hover:bg-opacity-75 transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close image modal"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ 
                  duration: 0.3, 
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200
                }}
                whileHover={{ 
                  scale: 1.1,
                  backgroundColor: "rgba(0, 0, 0, 0.8)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
              
              {/* Enhanced modal title with animation */}
              <motion.div 
                className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 text-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <motion.div 
                  className="bg-black bg-opacity-50 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm sm:text-base"
                  whileHover={{ 
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    scale: 1.02
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedImage.title}
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}