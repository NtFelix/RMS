import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Spinner } from "./ui/spinner";
import { ReactNode } from "react";
import { formatNumber } from "@/utils/format";

interface SummaryCardProps {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  description,
  icon,
  isLoading = false,
  className = "",
}: SummaryCardProps) {
  return (
    <Card className={`relative overflow-hidden rounded-xl shadow-md transition-opacity duration-200 ${isLoading ? 'opacity-75' : 'opacity-100'} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatNumber(value)} €
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
      {isLoading && (
        <div className="absolute top-2 right-2">
          <Spinner size="sm" />
        </div>
      )}
    </Card>
  );
}
