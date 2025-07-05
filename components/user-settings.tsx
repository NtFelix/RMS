"use client"

// useState, useRouter, createClient removed as they are now in useLogout
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react" // Settings import removed
import { cn } from "@/lib/utils"
import { useLogout } from "@/hooks/use-logout" // Import the new hook

export function UserSettings() {
  const { handleLogout, isLoading } = useLogout();
  // const router = useRouter() // Handled by useLogout
  // const [isLoading, setIsLoading] = useState(false) // Handled by useLogout

  // const handleLogout = () => { // This logic is now in useLogout
  //   setIsLoading(true)
  //   const supabase = createClient()
  //   supabase.auth.signOut().then(() => {
  //     router.push("/auth/login")
  //   }).catch((error) => {
  //     console.error("Error signing out:", error)
  //     setIsLoading(false)
  //   })
  // }

  // TODO: Replace "PM" with dynamic user initials or a generic user icon if available
  const userInitials = "PM";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Using a Button component, styled to appear as a simple div container */}
          <Button
            variant="ghost" // Use ghost variant to remove default button styling
            className={cn(
              "flex items-center p-2 rounded-md cursor-pointer transition-colors hover:bg-muted h-auto w-auto justify-start"
              // Add any other classes for layout or spacing if needed
            )}
          >
            {/* This is the circular icon part */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <span className="text-xs font-medium">{userInitials}</span>
            </div>
            {/* Optionally, add user name or other info here, which will also be part of the clickable trigger */}
            {/* <span className="ml-2 text-sm font-medium">User Name</span> */}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 ml-4">
          <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Settings DropdownMenuItem and its Separator are removed */}
          {/* The SettingsModal instance is also removed from here as it's now handled by DirectSettingsTrigger */}
          <DropdownMenuItem onClick={() => handleLogout()} disabled={isLoading}> {/* Wrap handleLogout in an arrow function */}
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoading ? "Wird abgemeldet..." : "Abmelden"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* <SettingsModal open={openModal} onOpenChange={setOpenModal} /> Modal removed from here */}
    </>
  )
}
