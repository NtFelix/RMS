'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { PillTabSwitcher } from "@/components/ui/pill-tab-switcher";

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
  isLoading: boolean;
  imageErrors: Record<string, boolean>;
  tabTransitionLoading: boolean;
  hasInitialized: boolean;
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
  hasImageError?: boolean;
  onImageError?: () => void;
  onImageLoad?: () => void;
}

function TabContent({ tab, onImageClick, hasImageError, onImageError, onImageLoad }: TabContentProps) {
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
          hasError={hasImageError}
          onImageError={onImageError}
          onImageLoad={onImageLoad}
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

// Tab Image Component with enhanced error handling and loading states
interface TabImageProps {
  tab: FinanceTab;
  onImageClick: (image: { src: string; alt: string; title: string }) => void;
  hasError?: boolean;
  onImageError?: () => void;
  onImageLoad?: () => void;
}

function TabImage({ tab, onImageClick, hasError, onImageError, onImageLoad }: TabImageProps) {
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(hasError || false);
  const [retryCount, setRetryCount] = useState(0);

  const MAX_RETRY_ATTEMPTS = 2;
  const RETRY_DELAY_MS = 1000; // 1 second delay between retries



  const handleImageLoad = () => {
    setIsImageLoading(false);
    setImageError(false);
    setRetryCount(0);
    onImageLoad?.();
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setImageError(true);
    onImageError?.();
    console.error(`Failed to load image for ${tab.title}: ${tab.image}`);
  };

  const handleRetryImage = () => {
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      setRetryCount(prev => prev + 1);
      setImageError(false);
      setIsImageLoading(false);

      // Add delay before retry to avoid overwhelming the server
      setTimeout(() => {
        // Force image reload by adding timestamp
        const img = document.createElement('img');
        img.onload = handleImageLoad;
        img.onerror = handleImageError;
        img.src = `${tab.image}?retry=${retryCount + 1}&t=${Date.now()}`;
      }, RETRY_DELAY_MS);
    }
  };

  // Enhanced fallback image placeholder with retry option
  const FallbackImage = () => (
    <div className="w-full h-[400px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
      <div className="text-center space-y-4 p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <svg className="w-16 h-16 text-muted-foreground mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </motion.div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Bild nicht verfügbar</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {tab.title} Screenshot
          </p>
          {retryCount < MAX_RETRY_ATTEMPTS && (
            <motion.button
              onClick={handleRetryImage}
              className="mt-3 px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Erneut versuchen ({retryCount + 1}/{MAX_RETRY_ATTEMPTS + 1})
            </motion.button>
          )}
          {retryCount >= MAX_RETRY_ATTEMPTS && (
            <p className="text-xs text-destructive/70 mt-2">
              Maximale Anzahl von Versuchen erreicht
            </p>
          )}
        </div>
      </div>
    </div>
  );



  return (
    <div className="relative group">
      <div className="relative rounded-lg overflow-hidden shadow-lg transition-transform duration-500 group-hover:scale-[1.02]">
        {imageError ? (
          <FallbackImage />
        ) : (
          <>
            <Image
                src={tab.image}
                alt={tab.imageAlt}
                width={600}
                height={400}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
                className="w-full h-auto object-contain cursor-pointer touch-manipulation"
                onClick={() => onImageClick({
                  src: tab.image,
                  alt: tab.imageAlt,
                  title: tab.title
                })}
                onLoad={handleImageLoad}
                onError={handleImageError}
                priority={false}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />

            {/* Hover overlay matching feature-sections pattern */}
            {!imageError && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                {/* Zoom Icon Overlay - top right corner like feature-sections */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Image Modal Component with error handling
interface ImageModalProps {
  selectedImage: {
    src: string;
    alt: string;
    title: string;
  };
  onClose: () => void;
}

function ImageModal({ selectedImage, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="relative max-w-6xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2 transition-colors duration-200 z-10"
          aria-label="Schließen"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Image Title */}
        <div id="modal-title" className="absolute -top-12 left-0 text-white text-lg font-semibold">
          {selectedImage.title}
        </div>

        {/* Image Container */}
        <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10">
          <Image
            src={selectedImage.src}
            alt={selectedImage.alt}
            width={1200}
            height={900}
            className="w-full h-auto object-contain max-h-[80vh]"
            priority
          />
        </div>
      </motion.div>
    </div>
  );
}



export default function FinanceShowcase({ }: FinanceShowcaseProps) {
  // Component state management for active tab tracking
  const [activeTab, setActiveTab] = useState<string>(financeTabsData[0]?.id || 'dashboard');
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [hasInitialized, setHasInitialized] = useState<boolean>(true);
  const [componentError, setComponentError] = useState<string | null>(null);

  // Ref for content
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize component with error boundary
  useEffect(() => {
    try {
      if (financeTabsData.length === 0) {
        throw new Error('No finance tab data available');
      }

      // Validate tab data structure
      const invalidTabs = financeTabsData.filter(tab =>
        !tab.id || !tab.title || !tab.description || !tab.image
      );

      if (invalidTabs.length > 0) {
        console.warn('Invalid tab data detected:', invalidTabs);
      }

      setHasInitialized(true);
    } catch (error) {
      console.error('Error initializing FinanceShowcase:', error);
      setComponentError(error instanceof Error ? error.message : 'Unknown initialization error');
    }
  }, []);

  // Get the currently active tab data with comprehensive fallback handling
  const getCurrentTab = (): FinanceTab => {
    if (financeTabsData.length === 0) {
      // Return a fallback tab if no data is available
      return {
        id: 'fallback',
        title: 'Finanzverwaltung',
        description: 'Umfassende Finanzverwaltung für Ihre Immobilien',
        image: '/placeholder.svg',
        imageAlt: 'Finance management placeholder',
        features: ['Grundlegende Finanzverwaltung'],
        dataCapabilities: {
          filtering: ['Basis-Filter'],
          searching: ['Basis-Suche'],
          tracking: ['Basis-Tracking']
        }
      };
    }

    const foundTab = financeTabsData.find(tab => tab.id === activeTab);
    return foundTab || financeTabsData[0];
  };

  const currentTab = getCurrentTab();

  // Handle image loading errors
  const handleImageError = (tabId: string) => {
    setImageErrors(prev => ({ ...prev, [tabId]: true }));
  };

  // Handle image loading success
  const handleImageLoad = (tabId: string) => {
    setImageErrors(prev => ({ ...prev, [tabId]: false }));
  };

  // Tab switching logic - instant switching without loading states
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;

    try {
      // Validate tab ID exists in our data
      const tabExists = financeTabsData.some(tab => tab.id === tabId);
      if (!tabExists) {
        console.warn(`Invalid tab ID: ${tabId}. Falling back to first tab.`);
        const fallbackTabId = financeTabsData[0]?.id || 'dashboard';
        setActiveTab(fallbackTabId);
        return;
      }

      // Clear any previous component errors
      setComponentError(null);

      // Instant tab switching
      setActiveTab(tabId);
    } catch (error) {
      console.error('Error in handleTabChange:', error);
      setComponentError('Unerwarteter Fehler beim Tab-Wechsel');
      // Fallback to first tab on error
      setActiveTab(financeTabsData[0]?.id || 'dashboard');
    }
  };



  // Error boundary component
  if (componentError) {
    return (
      <section className="py-24 px-4 bg-background text-foreground">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-8"
            >
              <svg className="w-16 h-16 text-destructive mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-xl font-semibold text-destructive mb-2">
                Fehler beim Laden der Finanzübersicht
              </h3>
              <p className="text-muted-foreground mb-4">
                {componentError}
              </p>
              <button
                onClick={() => {
                  setComponentError(null);
                  setHasInitialized(false);
                  // Retry initialization
                  setTimeout(() => {
                    try {
                      setHasInitialized(true);
                    } catch (error) {
                      console.error('Retry failed:', error);
                    }
                  }, 100);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Erneut versuchen
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }



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
        <div className="flex justify-center mb-8 sm:mb-12">
          <PillTabSwitcher
            tabs={financeTabsData.map(tab => ({
              id: tab.id,
              label: tab.title,
              value: tab.id
            }))}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Tab Content */}
        <div
          ref={contentRef}
          className="relative"
        >
          <AnimatePresence mode="wait">
            <TabContent
              key={activeTab}
              tab={currentTab}
              onImageClick={setSelectedImage}
              hasImageError={imageErrors[activeTab]}
              onImageError={() => handleImageError(activeTab)}
              onImageLoad={() => handleImageLoad(activeTab)}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Enhanced Image Modal with error handling and animations */}
      <AnimatePresence>
        {selectedImage && (
          <ImageModal
            selectedImage={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}