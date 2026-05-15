"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Eye } from "lucide-react";
import Link from "next/link";

// Type for the formatted transaction used in the component
interface Transaction {
  id: string;
  name: string;
  datum: string;
  betrag: number;
  ist_einnahmen: boolean;
  wohnung_name: string | null;
}

interface LastTransactionsContainerProps {
  initialTransactions?: Transaction[];
}

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function LastTransactionsContainer({ initialTransactions }: LastTransactionsContainerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions || []);
  const [loading, setLoading] = useState(!initialTransactions);

  // Derive data from props if available to avoid unnecessary re-renders
  const displayTransactions = initialTransactions || transactions;
  const isLoading = initialTransactions ? false : loading;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return currencyFormatter.format(Math.abs(amount));
  };

  return (
    <Card className="h-full flex flex-col bg-zinc-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Letzte Transaktionen</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Lade Daten…" : `${displayTransactions.length} neueste Einträge`}
            </p>
          </div>
          <Link href="/finanzen">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Eye className="size-4" />
              Alle anzeigen
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full size-8 border-t-2 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto h-full pr-2">
            {displayTransactions.length > 0 ? (
              displayTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 dark:table-row-hover transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${
                      transaction.ist_einnahmen 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.ist_einnahmen ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownRight className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {transaction.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(transaction.datum)}</span>
                        {transaction.wohnung_name && (
                          <>
                            <span>•</span>
                            <span className="truncate">{transaction.wohnung_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-sm font-semibold ${
                      transaction.ist_einnahmen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.ist_einnahmen ? '+' : '-'}{formatCurrency(transaction.betrag)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ArrowUpRight className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Keine Transaktionen gefunden</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
