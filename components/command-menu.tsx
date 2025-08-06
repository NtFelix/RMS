"use client"

import { useEffect, useState } from "react" // Added useState
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, LayoutDashboard, CreditCard } from "lucide-react"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { toast } from "@/hooks/use-toast" // Added
import {
  getUserSubscriptionContext,
  getPlanApartmentLimit,
  getUserApartmentCount,
} from "@/app/user-actions" // Added

// Stelle sicher, dass der Mieter-Link im Command-Menü korrekt ist
const navigationItems = [
  {
    title: "Startseite",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Dashboard",
    href: "/home",
    icon: BarChart3,
  },
  {
    title: "Häuser",
    href: "/haeuser",
    icon: Building2,
  },
  {
    title: "Mieter",
    href: "/mieter",
    icon: Users,
  },
  {
    title: "Wohnungen",
    href: "/wohnungen",
    icon: Home,
  },
  {
    title: "Finanzen",
    href: "/finanzen",
    icon: Wallet,
  },
  {
    title: "Betriebskosten",
    href: "/betriebskosten",
    icon: FileSpreadsheet,
  },
  {
    title: "Aufgaben",
    href: "/todos",
    icon: CheckSquare,
  },
]

export function CommandMenu() {
  const router = useRouter()
  const { open, setOpen } = useCommandMenu()
  const [isLoadingWohnungContext, setIsLoadingWohnungContext] = useState(false) // Added loading state
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false) // Loading state for subscription management

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  const handleManageSubscription = async () => {
    setIsLoadingSubscription(true);
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

      if (!response.ok) {
        throw new Error(`Failed to create customer portal session: ${response.status} ${response.statusText}`);
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      toast({
        title: 'Error',
        description: 'Could not open subscription management. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubscription(false);
      setOpen(false);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Befehl eingeben oder suchen..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => {
                router.push(item.href)
                setOpen(false)
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Aktionen">
          <CommandItem
            onSelect={() => {
              setOpen(false)
              // Use modal store to open tenant modal for adding
              useModalStore.getState().openTenantModal()
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            Mieter hinzufügen
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false)
              // Use modal store to open house modal for adding
              useModalStore.getState().openHouseModal()
            }}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Haus hinzufügen
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false)
              useModalStore.getState().openFinanceModal()
            }}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Rechnung erstellen
          </CommandItem>
          <CommandItem
            disabled={isLoadingWohnungContext} // Added disabled state
            onSelect={async () => {
              setIsLoadingWohnungContext(true)
              toast({ title: "Lade...", description: "Wohnungslimit wird geprüft." })

              let apartmentLimit: number | typeof Infinity | undefined = undefined
              let isActiveSubscription: boolean | undefined = undefined
              let apartmentCount: number | undefined = undefined

              try {
                const subContext = await getUserSubscriptionContext()

                if (subContext.error || !subContext.stripe_price_id || !subContext.stripe_subscription_status) {
                  isActiveSubscription = false
                  toast({
                    title: "Fehler",
                    description: "Abonnementdetails konnten nicht vollständig geladen werden. Modal wird geöffnet.",
                    variant: "destructive",
                  })
                } else {
                  isActiveSubscription = subContext.stripe_subscription_status === "active"
                  if (isActiveSubscription && subContext.stripe_price_id) {
                    const limitResult = await getPlanApartmentLimit(subContext.stripe_price_id)
                    if (limitResult.error || limitResult.limitWohnungen === undefined || limitResult.limitWohnungen === null) { // check for null explicitly
                      apartmentLimit = undefined
                      toast({
                        title: "Fehler",
                        description: "Wohnungslimit konnte nicht geladen werden.",
                        variant: "destructive",
                      })
                    } else {
                      apartmentLimit = limitResult.limitWohnungen
                    }
                  } else {
                    // Not active or no price ID, limit remains undefined or could be set to 0
                    // For now, undefined is fine as modal will handle it.
                  }
                }

                const countResult = await getUserApartmentCount()
                if (countResult.error || countResult.count === undefined) {
                  apartmentCount = undefined
                  toast({
                    title: "Fehler",
                    description: "Aktuelle Wohnungsanzahl konnte nicht geladen werden.",
                    variant: "destructive",
                  })
                } else {
                  apartmentCount = countResult.count
                }
              } catch (e) {
                // Catch any unexpected errors during the process
                console.error("Error in Wohnung hinzufügen onSelect:", e)
                toast({
                  title: "Unerwarteter Fehler",
                  description: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
                  variant: "destructive",
                })
                // Ensure modal still opens, but with potentially missing data
                // isActiveSubscription, apartmentLimit, apartmentCount might be undefined
              } finally {
                setOpen(false)
                useModalStore
                  .getState()
                  .openWohnungModal(undefined, [], undefined, apartmentCount, apartmentLimit, isActiveSubscription)
                setIsLoadingWohnungContext(false)
              }
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Wohnung hinzufügen
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              // Use modal store to open aufgabe modal for adding
              useModalStore.getState().openAufgabeModal();
            }}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Aufgabe hinzufügen
          </CommandItem>
          <CommandItem
            onSelect={handleManageSubscription}
            disabled={isLoadingSubscription}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isLoadingSubscription ? 'Lade...' : 'Abonnement verwalten'}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
