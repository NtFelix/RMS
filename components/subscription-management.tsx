'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/utils/supabase/client';
import { 
  CreditCard, 
  FileText, 
  ExternalLink, 
  Download, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  Eye
} from 'lucide-react';



interface SubscriptionPlan {
  priceId: string;
  name: string;
  productName?: string;
  description?: string | null;
  price: number | null;
  currency: string;
  interval?: string | null;
  interval_count?: number | null;
  features: string[];
  limitWohnungen: number | null;
}

interface UserProfile {
  id: string;
  email?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_current_period_end?: string | null;
  stripe_cancel_at_period_end?: boolean | null;
  activePlan?: SubscriptionPlan | null;
  currentWohnungenCount?: number;
}

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

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  } | null;
  billing_details?: {
    name?: string | null;
  } | null;
  created: number;
}

interface SubscriptionManagementProps {
  profile: UserProfile;
  onProfileUpdate: () => void;
}

// Credit card brand colors and styling
const getCardBrandStyles = (brand: string) => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return {
        gradient: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800',
        textColor: 'text-white',
        logo: '💳', // You can replace with actual Visa logo
      };
    case 'mastercard':
      return {
        gradient: 'bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500',
        textColor: 'text-white',
        logo: '💳',
      };
    case 'amex':
    case 'american_express':
      return {
        gradient: 'bg-gradient-to-br from-green-600 via-green-700 to-green-800',
        textColor: 'text-white',
        logo: '💳',
      };
    default:
      return {
        gradient: 'bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800',
        textColor: 'text-white',
        logo: '💳',
      };
  }
};

// Credit Card Component
const CreditCardDisplay = ({ paymentMethod, cardholderName }: { paymentMethod: PaymentMethod; cardholderName: string }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  if (!paymentMethod.card) return null;
  
  const { card } = paymentMethod;
  const brandStyles = getCardBrandStyles(card.brand);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  
  return (
    <div 
      className={`relative w-full max-w-md aspect-[1.586/1] rounded-2xl p-6 shadow-lg cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${brandStyles.gradient} ${brandStyles.textColor}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Background Pattern */}
      <div className="absolute inset-0 rounded-2xl opacity-10">
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20"></div>
        <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/15"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-white/5"></div>
      </div>
      
      {/* Simple Hover Glow */}
      <div 
        className={`absolute inset-0 rounded-2xl bg-white/10 pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Subtle Shine Effect */}
      <div 
        className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ${
          isHovered ? 'opacity-30' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
        }}
      />
      
      {/* Card Content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Top Section - Brand and Type */}
        <div className="flex justify-between items-start">
          <div className="text-sm font-medium opacity-90">
            {card.funding.toUpperCase()}
          </div>
          <div className="text-xl font-bold">
            {card.brand.toUpperCase()}
          </div>
        </div>
        
        {/* Middle Section - Card Number */}
        <div className="space-y-4 flex-1 flex items-center">
          <div className="text-xl font-mono tracking-wider">
            •••• •••• •••• {card.last4}
          </div>
        </div>
        
        {/* Bottom Section - Name and Expiry */}
        <div className="flex justify-between items-end">
          <div className="flex-1 min-w-0">
            <div className="text-xs opacity-70 uppercase tracking-wide">Karteninhaber</div>
            <div className="text-sm font-medium truncate pr-4">
              {cardholderName}
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="text-xs opacity-70 uppercase tracking-wide">Gültig bis</div>
            <div className="text-sm font-mono">
              {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SubscriptionManagement({ profile, onProfileUpdate }: SubscriptionManagementProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  const [cardholderName, setCardholderName] = useState<string>('');
  const { toast } = useToast();



  const formatBillingCycle = (interval?: string | null, intervalCount?: number | null) => {
    if (!interval) return null;
    
    const count = intervalCount || 1;
    
    switch (interval) {
      case 'month':
        return count === 1 ? 'Monatlich' : `Alle ${count} Monate`;
      case 'year':
        return count === 1 ? 'Jährlich' : `Alle ${count} Jahre`;
      case 'week':
        return count === 1 ? 'Wöchentlich' : `Alle ${count} Wochen`;
      case 'day':
        return count === 1 ? 'Täglich' : `Alle ${count} Tage`;
      default:
        return `Alle ${count} ${interval}`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Aktiv</Badge>;
      case 'trialing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Testphase</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Gekündigt</Badge>;
      case 'past_due':
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Überfällig</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  const fetchPaymentMethods = async () => {
    if (!profile.stripe_customer_id) return;
    
    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch('/api/stripe/payment-methods');
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      
      const data = await response.json();
      setPaymentMethods(data.payment_methods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: 'Fehler',
        description: 'Zahlungsmethoden konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const createCustomerPortalSession = async () => {
    setIsCreatingPortalSession(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: window.location.href,
        }),
      });

      if (!response.ok) throw new Error('Failed to create portal session');
      
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast({
        title: 'Fehler',
        description: 'Kundenportal konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPortalSession(false);
    }
  };

  // Fetch cardholder name from user metadata
  useEffect(() => {
    const fetchCardholderName = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          const firstName = user.user_metadata.first_name || '';
          const lastName = user.user_metadata.last_name || '';
          setCardholderName(`${firstName} ${lastName}`.trim() || 'Karteninhaber');
        } else {
          setCardholderName('Karteninhaber');
        }
      } catch (error) {
        console.error('Error fetching cardholder name:', error);
        setCardholderName('Karteninhaber');
      }
    };

    fetchCardholderName();
  }, []);

  useEffect(() => {
    if (profile.stripe_customer_id) {
      fetchInvoices();
      fetchPaymentMethods();
    }
  }, [profile.stripe_customer_id]);

  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')
    : null;

  return (
    <div className="space-y-6">
      {/* Subscription Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Abonnement-Übersicht
              </CardTitle>
              <CardDescription>
                Verwalten Sie Ihr Abonnement und Ihre Zahlungsdetails
              </CardDescription>
            </div>
            <Button
              onClick={createCustomerPortalSession}
              disabled={isCreatingPortalSession || !profile.stripe_customer_id}
              variant="outline"
              size="sm"
            >
              {isCreatingPortalSession ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Kundenportal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {profile.activePlan ? (
            <div className="space-y-4">
              {/* Plan Information */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">
                      {profile.activePlan.productName || 'Abonnement'}
                    </h3>
                    {getStatusBadge(profile.stripe_subscription_status || 'unknown')}
                  </div>
                  {profile.activePlan.description && (
                    <p className="text-sm text-muted-foreground">
                      {profile.activePlan.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {profile.activePlan.price && (
                    <div className="text-2xl font-bold">
                      {(profile.activePlan.price / 100).toFixed(2)} {profile.activePlan.currency.toUpperCase()}
                    </div>
                  )}
                  {formatBillingCycle(profile.activePlan.interval, profile.activePlan.interval_count) && (
                    <div className="text-sm text-muted-foreground">
                      {formatBillingCycle(profile.activePlan.interval, profile.activePlan.interval_count)}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Subscription Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPeriodEnd && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      {profile.stripe_cancel_at_period_end ? 'Endet am' : 'Nächste Verlängerung'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{currentPeriodEnd}</span>
                    </div>
                  </div>
                )}

                {profile.currentWohnungenCount !== undefined && profile.activePlan.limitWohnungen && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Wohnungen genutzt</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{profile.currentWohnungenCount} / {profile.activePlan.limitWohnungen}</span>
                        <span className="text-muted-foreground">
                          {Math.round((profile.currentWohnungenCount / profile.activePlan.limitWohnungen) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min((profile.currentWohnungenCount / profile.activePlan.limitWohnungen) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancellation Notice */}
              {profile.stripe_cancel_at_period_end && profile.stripe_current_period_end && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-800 dark:text-orange-200">
                        Kündigung geplant
                      </h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        Ihr Abonnement endet am {new Date(profile.stripe_current_period_end).toLocaleDateString('de-DE')}. 
                        Sie können es jederzeit über das Kundenportal reaktivieren.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Kein aktives Abonnement</h3>
              <p className="text-muted-foreground mb-4">
                Sie haben derzeit kein aktives Abonnement.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zahlungsmethoden</CardTitle>
              <CardDescription>
                Verwalten Sie Ihre gespeicherten Zahlungsmethoden
              </CardDescription>
            </div>
            <Button
              onClick={fetchPaymentMethods}
              disabled={isLoadingPaymentMethods}
              variant="outline"
              size="sm"
            >
              {isLoadingPaymentMethods ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPaymentMethods ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : paymentMethods.length > 0 ? (
            <div className="space-y-6">
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="space-y-4">
                  {/* Credit Card Display */}
                  <div className="flex justify-center">
                    <CreditCardDisplay 
                      paymentMethod={pm} 
                      cardholderName={pm.billing_details?.name || cardholderName}
                    />
                  </div>
                  
                  {/* Card Details */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Kartentyp:</span>
                        <div className="font-medium capitalize">{pm.card?.funding}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hinzugefügt:</span>
                        <div className="font-medium">
                          {new Date(pm.created * 1000).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Keine Zahlungsmethoden</h3>
              <p className="text-muted-foreground mb-4">
                Sie haben noch keine Zahlungsmethoden gespeichert.
              </p>
              <Button
                onClick={createCustomerPortalSession}
                disabled={isCreatingPortalSession}
              >
                Zahlungsmethode hinzufügen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rechnungshistorie</CardTitle>
              <CardDescription>
                Alle Ihre Rechnungen und Zahlungen im Überblick
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
        </CardContent>
      </Card>
    </div>
  );
}