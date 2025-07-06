"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserSettings() {
  const router = useRouter();
  const [isLoadingLogout, setIsLoadingLogout] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [userName, setUserName] = useState("Lade...");
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Error fetching user:", authError?.message);
        setUserName("Nutzer");
        setUserEmail("Nicht angemeldet");
        setUserInitials("N");
        setIsLoadingUser(false);
        return;
      }

      setUserEmail(user.email || "Keine E-Mail");

      const { first_name: firstName, last_name: lastName } = user.user_metadata;

      if (firstName && lastName) {
        const fullName = `${firstName} ${lastName}`;
        setUserName(fullName);
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        setUserInitials(initials);
      } else if (firstName) {
        setUserName(firstName); // Show only first name if last name is missing
        setUserInitials(firstName.charAt(0).toUpperCase());
      } else {
        // Fallback if names are not in metadata
        setUserName("Namen in Einstellungen festlegen");
        setUserInitials("?");
      }
      setIsLoadingUser(false);
    };

    fetchUser();
  }, [supabase]);


  const handleLogout = () => {
    setIsLoadingLogout(true);
    supabase.auth.signOut().then(() => {
      router.push("/auth/login");
      // No need to setIsLoadingLogout(false) here as the component will likely unmount or redirect.
    }).catch((error) => {
      console.error("Error signing out:", error);
      setIsLoadingLogout(false); // Reset loading state on error
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
            aria-label="User menu"
          >
            <Avatar className="h-10 w-10">
              {/* Actual user image can be added if available in profile */}
              {/* <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} alt={userName} /> */}
              <AvatarImage src={"/placeholder-user.jpg"} alt={userName} /> {/* Keeping placeholder for now */}
              {/* Changed to accent blue background and white text for fallback */}
              <AvatarFallback className="bg-accent text-accent-foreground">{isLoadingUser ? "" : userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isLoadingUser ? "Lade..." : userName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isLoadingUser ? "" : userEmail}
              </span>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 ml-4">
          <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} disabled={isLoadingLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
