"use client"

import { useState, useEffect } from "react" // Added useEffect
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"; // Keep this if other buttons are styled with it, or remove if not.
import { LogOut, Settings } from "lucide-react"; // Removed User icon as it's not used.
import { SettingsModal } from "@/components/settings-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // For user avatar

export function UserSettings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  // TODO: Replace with actual user data fetching if available
  const [userName, setUserName] = useState("Max Mustermann"); // Placeholder name
  const [userEmail, setUserEmail] = useState("max.mustermann@example.com"); // Placeholder email
  const [userInitials, setUserInitials] = useState("MM"); // Placeholder initials

  // Effect to get user initials from name (example)
  useEffect(() => {
    if (userName) {
      const nameParts = userName.split(" ");
      const initials = nameParts.map(part => part.charAt(0).toUpperCase()).join("");
      setUserInitials(initials);
    }
  }, [userName]);


  const handleLogout = () => {
    setIsLoading(true);
    const supabase = createClient();
    supabase.auth.signOut().then(() => {
      router.push("/auth/login");
    }).catch((error) => {
      console.error("Error signing out:", error);
      setIsLoading(false); // Reset loading state on error
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Entire container is now the trigger */}
          <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder-user.jpg" alt={userName} /> {/* Placeholder image */}
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{userName}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</span>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 ml-4"> {/* Consider adjusting width if content changes */}
          <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Optional: Link to a dedicated profile page if it exists */}
          {/* <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profil</span>
          </DropdownMenuItem> */}
          <DropdownMenuItem onClick={() => setOpenModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoading ? "Wird abgemeldet..." : "Abmelden"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
