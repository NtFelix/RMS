"use client"

import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Skeleton } from "./ui/skeleton";
import { formatNumber, formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";

interface SummaryCardHoverDetails {
  average?: number;
  median?: number;
  breakdown?: Array<{ label: string; value: number }>;
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }> | React.ReactNode;
  hoverDetails?: SummaryCardHoverDetails;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
  valueFormatter?: (value: string | number) => string;
  // Legacy props for backward compatibility
  description?: string;
}

export function SummaryCard({
  title,
  value,
  icon,
  hoverDetails,
  onClick,
  isLoading = false,
  className,
  valueFormatter = (val) => typeof val === 'number' ? formatCurrency(val) : val.toString(),
  description, // Legacy prop
}: SummaryCardProps) {
  if (isLoading) {
    return <SummaryCardSkeleton className={className} />;
  }

  const CardWrapper = ({ children }: { children: ReactNode }) => {
    if (hoverDetails) {
      return (
        <HoverCard>
          <HoverCardTrigger asChild>
            {children}
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{title} - Details</h4>
                <p className="text-sm text-muted-foreground">
                  Zusätzliche Statistiken
                </p>
              </div>
              <div className="space-y-2">
                {hoverDetails.average !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Durchschnitt:</span>
                    <span className="font-medium">{formatCurrency(hoverDetails.average)}</span>
                  </div>
                )}
                {hoverDetails.median !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Median:</span>
                    <span className="font-medium">{formatCurrency(hoverDetails.median)}</span>
                  </div>
                )}
                {hoverDetails.breakdown && hoverDetails.breakdown.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Aufschlüsselung:</div>
                    {hoverDetails.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}:</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }
    return <>{children}</>;
  };

  return (
    <CardWrapper>
      <Card 
        className={cn(
          "relative overflow-hidden rounded-xl border-none shadow-md transition-all duration-200 hover:shadow-lg",
          onClick && "cursor-pointer hover:scale-[1.02]",
          className
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {React.isValidElement(icon) ? (
            icon
          ) : typeof icon === 'function' ? (
            React.createElement(icon, { className: "h-4 w-4 text-muted-foreground" })
          ) : (
            icon
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {valueFormatter(value)}
          </div>
          {hoverDetails && (
            <p className="text-xs text-muted-foreground mt-1">
              Hover für Details
            </p>
          )}
          {description && !hoverDetails && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

export function SummaryCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("relative overflow-hidden rounded-xl border-none shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}
