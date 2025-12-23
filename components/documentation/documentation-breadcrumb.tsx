'use client';

import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DocumentationBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function DocumentationBreadcrumb({ 
  items, 
  className = "" 
}: DocumentationBreadcrumbProps) {
  const router = useRouter();

  const handleNavigation = (item: BreadcrumbItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}
      aria-label="Breadcrumb"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/hilfe/dokumentation')}
        className="h-auto p-1 hover:bg-transparent hover:text-foreground"
        aria-label="Zur Dokumentation Startseite"
      >
        <Home className="h-4 w-4" />
      </Button>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          
          {index === items.length - 1 ? (
            // Current page - not clickable
            <span 
              className="font-medium text-foreground truncate max-w-[200px]"
              title={item.label}
            >
              {item.label}
            </span>
          ) : (
            // Clickable breadcrumb item
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item)}
              className="h-auto p-1 hover:bg-transparent hover:text-foreground truncate max-w-[200px]"
              title={item.label}
            >
              {item.label}
            </Button>
          )}
        </div>
      ))}
    </nav>
  );
}