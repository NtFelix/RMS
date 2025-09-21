'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react';

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  due_date: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
  subscription_id: string | null;
  payment_intent_id: string | null;
  lines: Array<{
    id: string;
    description: string | null;
    amount: number;
    quantity: number | null;
    price: {
      id: string;
      nickname: string | null;
      unit_amount: number | null;
      recurring: any;
    } | null;
  }>;
}

interface UserProfile {
  id: string;
  email?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_current_period_end?: string | null;
  stripe_cancel_at_period_end?: boolean | null;
  currentWohnungenCount?: number;
}

interface SubscriptionPaymentHistoryProps {
  profile: UserProfile;
}

export default function SubscriptionPaymentHistory({ profile }: SubscriptionPaymentHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const { toast } = useToast();

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Bezahlt</Badge>;
      case 'open':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"><Clock className="w-3 h-3 mr-1" />Offen</Badge>;
      case 'void':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Storniert</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Uneinbringlich</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const fetchInvoices = async () => {
    if (!profile.stripe_customer_id) return;
    
    setIsLoadingInvoices(true);
    try {
      const response = await fetch('/api/stripe/invoices?limit=20');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: 'Fehler',
        description: 'Rechnungen konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (profile.stripe_customer_id) {
      fetchInvoices();
    }
  }, [profile.stripe_customer_id]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div></div>
        <Button
          onClick={fetchInvoices}
          disabled={isLoadingInvoices}
          variant="outline"
          size="sm"
        >
          {isLoadingInvoices ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoadingInvoices ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  </div>
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="flex items-center gap-4 text-sm">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              
              {/* Invoice Line Items Skeleton */}
              <div className="pt-2 border-t">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : invoices.length > 0 ? (
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {invoice.number || `Rechnung ${invoice.id.slice(-8)}`}
                      </span>
                      {getInvoiceStatusBadge(invoice.status)}
                    </div>
                    {invoice.description && (
                      <p className="text-sm text-muted-foreground">
                        {invoice.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(invoice.created * 1000).toLocaleDateString('de-DE')}
                      </span>
                      {invoice.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Fällig: {new Date(invoice.due_date * 1000).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-semibold">
                      {(invoice.amount_due / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </div>
                    <div className="flex gap-2">
                      {invoice.hosted_invoice_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ansehen
                        </Button>
                      )}
                      {invoice.invoice_pdf && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Invoice Line Items */}
                {invoice.lines.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="space-y-1">
                      {invoice.lines.map((line) => (
                        <div key={line.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {line.description || 'Artikel'}
                            {line.quantity && line.quantity > 1 && ` (${line.quantity}x)`}
                          </span>
                          <span>{(line.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Rechnungen gefunden</h3>
          <p className="text-muted-foreground">
            Es wurden noch keine Rechnungen für Ihr Konto erstellt.
          </p>
        </div>
      )}
    </div>
  );
}