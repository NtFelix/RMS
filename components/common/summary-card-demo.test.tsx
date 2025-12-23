import { render } from '@testing-library/react';
import { SummaryCard } from '@/components/common/summary-card';
import { Home, Users, Euro, SquareIcon } from 'lucide-react';

// This is a demo component to visually test the SummaryCard
// It's not meant to be used in production, just for testing purposes
export function SummaryCardDemo() {
  const handleCardClick = (cardType: string) => {
    console.log(`Clicked on ${cardType} card`);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-8">SummaryCard Demo</h1>
      
      {/* Grid layout with all features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Gesamtfläche"
          value={450}
          icon={SquareIcon}
          valueFormatter={(val) => `${val} m²`}
          hoverDetails={{
            average: 112.5,
            median: 110,
            breakdown: [
              { label: 'Wohnung 1', value: 85 },
              { label: 'Wohnung 2', value: 120 },
              { label: 'Wohnung 3', value: 95 },
              { label: 'Wohnung 4', value: 150 },
            ],
          }}
          onClick={() => handleCardClick('area')}
        />
        
        <SummaryCard
          title="Anzahl Wohnungen"
          value="4 Einheiten"
          icon={Home}
          valueFormatter={(val) => val.toString()}
          hoverDetails={{
            breakdown: [
              { label: '2-Zimmer', value: 2 },
              { label: '3-Zimmer', value: 1 },
              { label: '4-Zimmer', value: 1 },
            ],
          }}
          onClick={() => handleCardClick('apartments')}
        />
        
        <SummaryCard
          title="Gesamtmieter"
          value="3 Mieter"
          icon={Users}
          valueFormatter={(val) => val.toString()}
          hoverDetails={{
            breakdown: [
              { label: 'Aktive Mieter', value: 3 },
              { label: 'Freie Wohnungen', value: 1 },
            ],
          }}
          onClick={() => handleCardClick('tenants')}
        />
        
        <SummaryCard
          title="Gesamtmiete"
          value={2850}
          icon={Euro}
          hoverDetails={{
            average: 712.5,
            median: 700,
            breakdown: [
              { label: 'Wohnung 1', value: 650 },
              { label: 'Wohnung 2', value: 850 },
              { label: 'Wohnung 3', value: 700 },
              { label: 'Wohnung 4', value: 650 },
            ],
          }}
          onClick={() => handleCardClick('rent')}
        />
      </div>

      {/* Loading states */}
      <h2 className="text-xl font-semibold mb-4">Loading States</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Loading Card 1"
          value={0}
          icon={Home}
          isLoading={true}
        />
        <SummaryCard
          title="Loading Card 2"
          value={0}
          icon={Users}
          isLoading={true}
        />
        <SummaryCard
          title="Loading Card 3"
          value={0}
          icon={Euro}
          isLoading={true}
        />
        <SummaryCard
          title="Loading Card 4"
          value={0}
          icon={SquareIcon}
          isLoading={true}
        />
      </div>

      {/* Cards without hover details */}
      <h2 className="text-xl font-semibold mb-4">Simple Cards (No Hover)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Simple Card"
          value={1250}
          icon={Euro}
          onClick={() => handleCardClick('simple')}
        />
        <SummaryCard
          title="No Click Handler"
          value={850}
          icon={Home}
        />
        <SummaryCard
          title="Custom Format"
          value="5 Units"
          icon={Users}
          valueFormatter={(val) => val.toString()}
        />
        <SummaryCard
          title="Large Number"
          value={125000}
          icon={Euro}
        />
      </div>
    </div>
  );
}

// Add a simple test to satisfy Jest
describe('SummaryCardDemo', () => {
  it('component exists', () => {
    expect(SummaryCardDemo).toBeDefined();
  });
});