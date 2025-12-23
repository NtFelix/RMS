"use client"
import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";

interface SummaryCardHoverDetails {
  average?: number;
  median?: number;
  breakdown?: Array<{ label: string; value: number }>;
  isCurrency?: boolean;
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
  // Legacy props
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
  valueFormatter = (val) => typeof val === "number" ? formatCurrency(val) : (val?.toString() ?? ""),
  description,
}: SummaryCardProps) {
  if (isLoading) {
    return <SummaryCardSkeleton className={className} />;
  }

  const formatHoverValue = (num: number) => {
    if (hoverDetails?.isCurrency) return formatCurrency(num);
    return valueFormatter ? valueFormatter(num) : num.toString();
  };

  const CardWrapper = ({ children }: { children: ReactNode }) => {
    if (hoverDetails) {
      return (
        <div className="relative group">
          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              {children}
            </HoverCardTrigger>
            <HoverCardContent
              className="w-80 absolute left-full top-0 ml-2 h-auto min-h-full p-2"
              side="right"
              align="start"
              sideOffset={0}
              alignOffset={0}
              style={{ height: "auto", minHeight: "100%" }}
            >
              <div className="space-y-0">
                <div className="mb-1">
                  <h4 className="text-sm font-semibold leading-tight">{title} - Details</h4>
                  <p className="text-sm text-muted-foreground leading-tight">Zusätzliche Statistiken</p>
                </div>
                <div className="space-y-0">
                  {hoverDetails.average !== undefined && (
                    <div className="flex justify-between text-sm leading-tight">
                      <span className="text-muted-foreground">Durchschnitt:</span>
                      <span className="font-medium">{formatHoverValue(hoverDetails.average)}</span>
                    </div>
                  )}
                  {hoverDetails.median !== undefined && (
                    <div className="flex justify-between text-sm leading-tight">
                      <span className="text-muted-foreground">Median:</span>
                      <span className="font-medium">{formatHoverValue(hoverDetails.median)}</span>
                    </div>
                  )}
                  {hoverDetails.breakdown && hoverDetails.breakdown.length > 0 && (
                    <div className="mt-1">
                      <div className="text-sm font-medium text-muted-foreground leading-tight">Aufschlüsselung:</div>
                      {hoverDetails.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm leading-tight">
                          <span className="text-muted-foreground">{item.label}:</span>
                          <span className="font-medium">{formatHoverValue(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <CardWrapper>
      <Card
        className={cn(
          // Main-Style-Äquivalent: abgeleitet von main, ohne Opacity-Loading (Skeleton übernimmt)
          "relative overflow-hidden rounded-3xl shadow-sm transition-opacity duration-200",
          // Background color matching dashboard cards
          "bg-gray-50 dark:bg-[#22272e]",
          // sichtbare Border wie im Main-Design
          "border border-gray-200 dark:border-[#3C4251]",
          // Add cursor pointer and hover scale when onClick is provided
          onClick && "cursor-pointer hover:scale-[1.02] transition-transform duration-200",
          className
        )}
        onClick={onClick}
        role="region"
        aria-labelledby={`summary-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle
            className="text-sm font-medium text-muted-foreground"
            id={`summary-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {title}
          </CardTitle>
          {React.isValidElement(icon)
            ? icon
            : typeof icon === "function"
              ? React.createElement(icon, { className: "h-4 w-4 text-muted-foreground" })
              : icon}
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

          {!hoverDetails && description && (
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
    <Card
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-sm transition-opacity duration-200",
        // Background color matching dashboard cards
        "bg-gray-50 dark:bg-[#22272e]",
        // konsistent zur Hauptkarte: sichtbare Border
        "border border-gray-200 dark:border-[#3C4251]",
        className
      )}
    >
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
