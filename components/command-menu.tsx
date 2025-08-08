"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { BarChart3, Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare, LayoutDashboard, CreditCard, Search, Loader2, AlertCircle } from "lucide-react"
import { useCommandMenu } from "@/hooks/use-command-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { useSearch } from "@/hooks/use-search"
import { SearchResultGroup } from "@/components/search-result-group"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { SearchResult } from "@/types/search"
import {
  getUserSubscriptionContext,
  getPlanApartmentLimit,
  getUserApartmentCount,
} from "@/app/user-actions"

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
  const [isLoadingWohnungContext, setIsLoadingWohnungContext] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false)
  
  // Search functionality
  const {
    query,
    setQuery,
    results,
    isLoading: isSearchLoading,
    error: searchError,
    totalCount,
    clearSearch,
    retry: retrySearch
  } = useSearch({
    debounceMs: 300,
    limit: 5
  })

  // Determine if we should show search results or navigation
  const showSearchResults = query.trim().length > 0
  const hasSearchResults = results.length > 0

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
      // Clear search when Escape is pressed and there's a query
      if (e.key === "Escape" && query.trim().length > 0) {
        e.preventDefault()
        clearSearch()
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen, open, query, clearSearch])

  // Clear search when menu is closed
  useEffect(() => {
    if (!open && query.trim().length > 0) {
      clearSearch()
    }
  }, [open, query, clearSearch])

  // Handle search result selection
  const handleSearchResultSelect = (result: SearchResult) => {
    setOpen(false)
    
    // Navigate based on result type
    switch (result.type) {
      case 'tenant':
        router.push('/mieter')
        break
      case 'house':
        router.push('/haeuser')
        break
      case 'apartment':
        router.push('/wohnungen')
        break
      case 'finance':
        router.push('/finanzen')
        break
      case 'task':
        router.push('/todos')
        break
      default:
        break
    }
  }

  // Handle search result actions (edit, view, etc.)
  const handleSearchResultAction = (result: SearchResult, actionIndex: number) => {
    const action = result.actions?.[actionIndex]
    if (action) {
      setOpen(false)
      
      // Open appropriate modal based on result type
      switch (result.type) {
        case 'tenant':
          useModalStore.getState().openTenantModal(result.id)
          break
        case 'house':
          useModalStore.getState().openHouseModal(result.id)
          break
        case 'apartment':
          useModalStore.getState().openWohnungModal(result.id)
          break
        case 'finance':
          useModalStore.getState().openFinanceModal(result.id)
          break
        case 'task':
          useModalStore.getState().openAufgabeModal(result.id)
          break
        default:
          break
      }
    }
  }

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
      setOpen(false); // Close the menu only on error
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  // Group search results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Suchen Sie nach Mietern, Häusern, Wohnungen..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Search Results */}
        {showSearchResults && (
          <>
            {/* Loading State */}
            {isSearchLoading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suche läuft...
              </div>
            )}

            {/* Error State */}
            {searchError && !isSearchLoading && (
              <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
                <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
                <p className="mb-2 text-center">{searchError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retrySearch}
                  className="text-xs"
                >
                  Erneut versuchen
                </Button>
              </div>
            )}

            {/* Search Results */}
            {!isSearchLoading && !searchError && hasSearchResults && (
              <>
                {/* Results Summary */}
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                  <div className="flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    <span>{totalCount} Ergebnisse für "{query}"</span>
                  </div>
                </div>

                {/* Grouped Results */}
                {groupedResults.tenant && (
                  <SearchResultGroup
                    title="Mieter"
                    type="tenant"
                    results={groupedResults.tenant}
                    onSelect={handleSearchResultSelect}
                    onAction={handleSearchResultAction}
                  />
                )}
                
                {groupedResults.house && (
                  <SearchResultGroup
                    title="Häuser"
                    type="house"
                    results={groupedResults.house}
                    onSelect={handleSearchResultSelect}
                    onAction={handleSearchResultAction}
                    showSeparator={!!groupedResults.tenant}
                  />
                )}
                
                {groupedResults.apartment && (
                  <SearchResultGroup
                    title="Wohnungen"
                    type="apartment"
                    results={groupedResults.apartment}
                    onSelect={handleSearchResultSelect}
                    onAction={handleSearchResultAction}
                    showSeparator={!!(groupedResults.tenant || groupedResults.house)}
                  />
                )}
                
                {groupedResults.finance && (
                  <SearchResultGroup
                    title="Finanzen"
                    type="finance"
                    results={groupedResults.finance}
                    onSelect={handleSearchResultSelect}
                    onAction={handleSearchResultAction}
                    showSeparator={!!(groupedResults.tenant || groupedResults.house || groupedResults.apartment)}
                  />
                )}
                
                {groupedResults.task && (
                  <SearchResultGroup
                    title="Aufgaben"
                    type="task"
                    results={groupedResults.task}
                    onSelect={handleSearchResultSelect}
                    onAction={handleSearchResultAction}
                    showSeparator={!!(groupedResults.tenant || groupedResults.house || groupedResults.apartment || groupedResults.finance)}
                  />
                )}
              </>
            )}

            {/* No Results */}
            {!isSearchLoading && !searchError && !hasSearchResults && (
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
                  <Search className="mb-2 h-8 w-8" />
                  <p>Keine Ergebnisse für "{query}"</p>
                  <p className="text-xs mt-1">Versuchen Sie andere Suchbegriffe</p>
                </div>
              </CommandEmpty>
            )}
          </>
        )}

        {/* Navigation and Actions (shown when not searching) */}
        {!showSearchResults && (
          <>
            <CommandEmpty>Keine Befehle gefunden.</CommandEmpty>
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
                  useModalStore.getState().openTenantModal()
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                Mieter hinzufügen
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
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
                disabled={isLoadingWohnungContext}
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
                        if (limitResult.error || limitResult.limitWohnungen === undefined || limitResult.limitWohnungen === null) {
                          apartmentLimit = undefined
                          toast({
                            title: "Fehler",
                            description: "Wohnungslimit konnte nicht geladen werden.",
                            variant: "destructive",
                          })
                        } else {
                          apartmentLimit = limitResult.limitWohnungen
                        }
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
                    console.error("Error in Wohnung hinzufügen onSelect:", e)
                    toast({
                      title: "Unerwarteter Fehler",
                      description: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
                      variant: "destructive",
                    })
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
                  setOpen(false)
                  useModalStore.getState().openAufgabeModal()
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
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
