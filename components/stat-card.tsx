import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { formatNumber } from "@/utils/format";
import * as React from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  unit?: string;       // e.g. "€", "€/m²", "m²", ""
  decimals?: boolean;  // default false; if true, format with 2 decimals, else integer
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  description,
  unit = "",
  decimals = false,
  className = "",
}: StatCardProps) {
  // Determine display value
  let displayValue: React.ReactNode;
  if (typeof value === "number") {
    if (decimals) {
      displayValue = formatNumber(value) + unit;
    } else {
      // Format as integer (no decimals) in de-DE
      displayValue = new Intl.NumberFormat("de-DE", {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(value) + unit;
    }
  } else {
    // value is a string, render as-is and ignore unit
    displayValue = value;
  }

  return (
    <Card className={`relative overflow-hidden rounded-xl border-none shadow-md transition-opacity duration-200 flex-1 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
}