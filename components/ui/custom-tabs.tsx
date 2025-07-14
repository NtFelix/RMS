'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

interface CustomTabsProps {
  tabs: { value: string; label: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  tabClassName?: string;
  activeIndicatorClassName?: string;
}

const CustomTabs: React.FC<CustomTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  tabClassName = '',
  activeIndicatorClassName = '',
}) => {
  return (
    <div className={`relative flex items-center justify-center p-1 bg-muted rounded-lg ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-md ${
            activeTab === tab.value ? 'text-primary-foreground' : 'text-muted-foreground'
          } ${tabClassName}`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {activeTab === tab.value && (
            <motion.span
              layoutId="bubble"
              className={`absolute inset-0 z-0 bg-primary rounded-md ${activeIndicatorClassName}`}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

interface CustomTabsContentProps {
  value: string;
  children: React.ReactNode;
}

const CustomTabsContent: React.FC<CustomTabsContentProps> = ({ value, children }) => {
  // This component is a placeholder to maintain a similar structure to Radix UI Tabs.
  // The actual content switching logic will be handled by the parent component.
  return <div data-state={value}>{children}</div>;
};


export { CustomTabs, CustomTabsContent };
