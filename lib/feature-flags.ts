// Fallback feature flag system when PostHog is blocked
export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  stage: 'alpha' | 'beta' | 'concept' | 'other';
  enabled: boolean;
}

// Define available feature flags (this would normally come from PostHog)
export const AVAILABLE_FEATURES: Omit<FeatureFlag, 'enabled'>[] = [
  {
    key: 'advanced-analytics',
    name: 'Erweiterte Analytik',
    description: 'Detaillierte Berichte und erweiterte Datenvisualisierung',
    stage: 'beta'
  },
  {
    key: 'ai-suggestions',
    name: 'KI-Vorschläge',
    description: 'Intelligente Vorschläge für Betriebskosten und Mieterbetreuung',
    stage: 'alpha'
  },
  {
    key: 'mobile-app',
    name: 'Mobile App',
    description: 'Native mobile Anwendung für iOS und Android',
    stage: 'concept'
  }
];

const STORAGE_KEY = 'rms-feature-flags';

export function getLocalFeatureFlags(): FeatureFlag[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const enabledFlags = JSON.parse(stored) as string[];
      return AVAILABLE_FEATURES.map(feature => ({
        ...feature,
        enabled: enabledFlags.includes(feature.key)
      }));
    }
  } catch (error) {
    console.error('Error loading local feature flags:', error);
  }
  
  // Return all features as disabled by default
  return AVAILABLE_FEATURES.map(feature => ({
    ...feature,
    enabled: false
  }));
}

export function setLocalFeatureFlag(key: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getLocalFeatureFlags();
    const enabledFlags = current
      .filter(f => f.key === key ? enabled : f.enabled)
      .map(f => f.key);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledFlags));
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('featureFlagsChanged', {
      detail: { key, enabled }
    }));
  } catch (error) {
    console.error('Error saving local feature flags:', error);
  }
}

export function isFeatureEnabled(key: string): boolean {
  const flags = getLocalFeatureFlags();
  return flags.find(f => f.key === key)?.enabled || false;
}