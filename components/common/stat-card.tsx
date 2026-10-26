"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/use-count-up";
import { formatNumber } from "@/utils/format";
import * as React from "react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  unit?: string;       // e.g. "€", "€/m²", "m²", ""
  decimals?: boolean;  // default false; if true, format with 2 decimals, else integer
  loading?: boolean;   // render a placeholder of the same height instead of the value (loading skeletons)
  animate?: boolean;   // default true; count numeric values up when they appear or change
  className?: string;
}

// "3 / 5" style values: every integer counts up on its own; the separators stay put.
const COUNTABLE_PAIR = /^\d+(\s*\/\s*\d+)+$/;

function CountUpInteger({ value, enabled }: { value: number; enabled: boolean }) {
  return <>{formatNumber(useCountUp(value, { enabled }), 0)}</>;
}

function CountUpPair({ text, enabled }: { text: string; enabled: boolean }) {
  // Keyed by the offset of each part in the text, which stays with the part (an array index would not).
  let offset = 0;
  return (
    <>
      {text.split(/(\d+)/).map((part, i) => {
        const key = offset;
        offset += part.length;
        return i % 2 === 1 ? <CountUpInteger key={key} value={Number(part)} enabled={enabled} /> : part;
      })}
    </>
  );
}

export function StatCard({
  title,
  value,
  icon,
  description,
  unit = "",
  decimals = false,
  loading = false,
  animate = true,
  className = "",
}: StatCardProps) {
  const counting = animate && !loading;
  const animatedNumber = useCountUp(typeof value === "number" ? value : 0, {
    enabled: counting && typeof value === "number",
  });

  // Determine display value
  let displayValue: React.ReactNode;
  if (typeof value === "number") {
    const decimalPlaces = decimals ? 2 : 0;
    const trimmedUnit = unit.trim();
    displayValue = formatNumber(counting ? animatedNumber : value, decimalPlaces) + (trimmedUnit ? ` ${trimmedUnit}` : "");
  } else if (counting && COUNTABLE_PAIR.test(value)) {
    displayValue = <CountUpPair text={value} enabled />;
  } else {
    // value is a string, render as-is and ignore unit
    displayValue = value;
  }

  return (
    <Card className={`relative overflow-hidden rounded-3xl shadow-xs transition-opacity duration-200 flex-1 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">
          {loading ? <Skeleton className="h-8 w-20" /> : displayValue}
        </div>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardContent>
    </Card>
  );
}