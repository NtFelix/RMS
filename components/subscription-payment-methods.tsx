'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/utils/supabase/client';
import { 
  CreditCard, 
  RefreshCw
} from 'lucide-react';

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

interface SubscriptionPaymentMethodsProps {
  profile: UserProfile;
}

// Credit card brand colors and styling
const getCardBrandStyles = (brand: string) => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return {
        gradient: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800',
        textColor: 'text-white',
        logo: '💳',
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

export default function SubscriptionPaymentMethods({ profile }: SubscriptionPaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);
  const [cardholderName, setCardholderName] = useState<string>('');
  const { toast } = useToast();

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
      fetchPaymentMethods();
    }
  }, [profile.stripe_customer_id]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div></div>
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

      {isLoadingPaymentMethods ? (
        <div className="space-y-6">
          {/* Credit Card Skeleton */}
          <div className="flex justify-center">
            <div className="w-full max-w-md aspect-[1.586/1] rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          
          {/* Card Details Skeleton */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
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
    </div>
  );
}