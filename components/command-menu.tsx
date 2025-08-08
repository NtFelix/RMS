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

  // Handle search result selection (main click)
  const handleSearchResultSelect = (result: SearchResult) => {
    setOpen(false)
    
    // Navigate to the appropriate page based on result type
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

  // Handle search result actions (edit, view, delete, etc.)
  const handleSearchResultAction = (result: SearchResult, actionIndex: number) => {
    const action = result.actions?.[actionIndex]
    if (!action) return

    setOpen(false)
    
    // Handle actions based on result type and action label
    switch (result.type) {
      case 'tenant':
        if (action.label === 'Bearbeiten') {
          // Open tenant edit modal with the specific tenant data
          // We need to fetch the full tenant data first
          handleEditTenant(result.id)
        } else if (action.label === 'Anzeigen') {
          // Navigate to tenant page
          router.push('/mieter')
        }
        break
        
      case 'house':
        if (action.label === 'Bearbeiten') {
          // Open house edit modal with the specific house data
          handleEditHouse(result.id)
        } else if (action.label === 'Anzeigen') {
          // Navigate to house page
          router.push('/haeuser')
        }
        break
        
      case 'apartment':
        if (action.label === 'Bearbeiten') {
          // Open apartment edit modal with the specific apartment data
          handleEditApartment(result.id)
        } else if (action.label === 'Anzeigen') {
          // Navigate to apartment page
          router.push('/wohnungen')
        }
        break
        
      case 'finance':
        if (action.label === 'Bearbeiten') {
          // Open finance edit modal with the specific finance data
          handleEditFinance(result.id)
        } else if (action.label === 'Anzeigen') {
          // Navigate to finance page
          router.push('/finanzen')
        } else if (action.label === 'Löschen') {
          // Handle delete action with confirmation
          handleDeleteFinanceRecord(result)
        }
        break
        
      case 'task':
        if (action.label === 'Bearbeiten') {
          // Open task edit modal with the specific task data
          handleEditTask(result.id)
        } else if (action.label.includes('markieren')) {
          // Handle task completion toggle
          handleToggleTaskCompletion(result)
        } else if (action.label === 'Löschen') {
          // Handle delete action with confirmation
          handleDeleteTask(result)
        }
        break
        
      default:
        break
    }
  }

  // Helper functions to fetch full entity data and open modals
  const handleEditTenant = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/mieter`)
      if (!response.ok) throw new Error('Failed to fetch tenants')
      
      const tenants = await response.json()
      const tenant = tenants.find((t: any) => t.id === tenantId)
      
      if (tenant) {
        // Also fetch wohnungen for the modal
        const wohnungenResponse = await fetch(`/api/wohnungen`)
        const wohnungen = wohnungenResponse.ok ? await wohnungenResponse.json() : []
        
        useModalStore.getState().openTenantModal(tenant, wohnungen)
      } else {
        toast({
          title: 'Fehler',
          description: 'Mieter nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Mieter konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditHouse = async (houseId: string) => {
    try {
      const response = await fetch(`/api/haeuser`)
      if (!response.ok) throw new Error('Failed to fetch houses')
      
      const houses = await response.json()
      const house = houses.find((h: any) => h.id === houseId)
      
      if (house) {
        useModalStore.getState().openHouseModal(house)
      } else {
        toast({
          title: 'Fehler',
          description: 'Haus nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Haus konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditApartment = async (apartmentId: string) => {
    try {
      const response = await fetch(`/api/wohnungen`)
      if (!response.ok) throw new Error('Failed to fetch apartments')
      
      const apartments = await response.json()
      const apartment = apartments.find((a: any) => a.id === apartmentId)
      
      if (apartment) {
        // Also fetch houses for the modal
        const housesResponse = await fetch(`/api/haeuser`)
        const houses = housesResponse.ok ? await housesResponse.json() : []
        
        useModalStore.getState().openWohnungModal(apartment, houses)
      } else {
        toast({
          title: 'Fehler',
          description: 'Wohnung nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Wohnung konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditFinance = async (financeId: string) => {
    try {
      const response = await fetch(`/api/finanzen`)
      if (!response.ok) throw new Error('Failed to fetch finances')
      
      const finances = await response.json()
      const finance = finances.find((f: any) => f.id === financeId)
      
      if (finance) {
        // Also fetch wohnungen for the modal
        const wohnungenResponse = await fetch(`/api/wohnungen`)
        const wohnungen = wohnungenResponse.ok ? await wohnungenResponse.json() : []
        
        useModalStore.getState().openFinanceModal(finance, wohnungen)
      } else {
        toast({
          title: 'Fehler',
          description: 'Finanzeintrag nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Finanzeintrag konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  const handleEditTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/todos`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      
      const tasks = await response.json()
      const task = tasks.find((t: any) => t.id === taskId)
      
      if (task) {
        useModalStore.getState().openAufgabeModal(task)
      } else {
        toast({
          title: 'Fehler',
          description: 'Aufgabe nicht gefunden.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Aufgabe konnte nicht geladen werden.',
        variant: 'destructive',
      })
    }
  }

  // Helper function to handle finance record deletion
  const handleDeleteFinanceRecord = (result: SearchResult) => {
    useModalStore.getState().openConfirmationModal({
      title: 'Finanzeintrag löschen',
      description: `Möchten Sie den Finanzeintrag "${result.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/finanzen/${result.id}`, {
            method: 'DELETE',
          })
          
          if (response.ok) {
            toast({
              title: 'Erfolg',
              description: 'Finanzeintrag wurde gelöscht.',
            })
            // Refresh the current page if we're on the finance page
            if (window.location.pathname === '/finanzen') {
              window.location.reload()
            }
          } else {
            throw new Error('Fehler beim Löschen')
          }
        } catch (error) {
          toast({
            title: 'Fehler',
            description: 'Finanzeintrag konnte nicht gelöscht werden.',
            variant: 'destructive',
          })
        }
      }
    })
  }

  // Helper function to handle task completion toggle
  const handleToggleTaskCompletion = async (result: SearchResult) => {
    const isCompleted = result.metadata?.completed
    try {
      const response = await fetch(`/api/todos/${result.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ist_erledigt: !isCompleted
        })
      })
      
      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: `Aufgabe wurde als ${!isCompleted ? 'erledigt' : 'offen'} markiert.`,
        })
        // Refresh the current page if we're on the tasks page
        if (window.location.pathname === '/todos') {
          window.location.reload()
        }
      } else {
        throw new Error('Fehler beim Aktualisieren')
      }
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Aufgabe konnte nicht aktualisiert werden.',
        variant: 'destructive',
      })
    }
  }

  // Helper function to handle task deletion
  const handleDeleteTask = (result: SearchResult) => {
    useModalStore.getState().openConfirmationModal({
      title: 'Aufgabe löschen',
      description: `Möchten Sie die Aufgabe "${result.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/todos/${result.id}`, {
            method: 'DELETE',
          })
          
          if (response.ok) {
            toast({
              title: 'Erfolg',
              description: 'Aufgabe wurde gelöscht.',
            })
            // Refresh the current page if we're on the tasks page
            if (window.location.pathname === '/todos') {
              window.location.reload()
            }
          } else {
            throw new Error('Fehler beim Löschen')
          }
        } catch (error) {
          toast({
            title: 'Fehler',
            description: 'Aufgabe konnte nicht gelöscht werden.',
            variant: 'destructive',
          })
        }
      }
    })
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
