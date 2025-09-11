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
import { LogOut, Settings, FileText } from "lucide-react"; // Removed User icon as it's not used.
import { SettingsModal } from "@/components/settings-modal";
import { TemplatesManagementModal } from "@/components/templates-management-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserSettings() {
  const router = useRouter();
  const [isLoadingLogout, setIsLoadingLogout] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [userName, setUserName] = useState("Lade...");
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      const supabase = createClient();
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

      const { first_name: rawFirstName, last_name: rawLastName } = user.user_metadata || {};

      const firstName = (typeof rawFirstName === 'string' ? rawFirstName.trim() : '');
      const lastName = (typeof rawLastName === 'string' ? rawLastName.trim() : '');

      if (firstName && lastName) {
        const fullName = `${firstName} ${lastName}`;
        setUserName(fullName);
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        setUserInitials(initials);
      } else if (firstName) {
        setUserName(firstName);
        setUserInitials(firstName.charAt(0).toUpperCase());
      } else {
        setUserName("Namen in Einstellungen festlegen");
        setUserInitials("?");
      }
      setIsLoadingUser(false);
    };

    fetchUser();
  }, []);


  const handleLogout = async () => {
    setIsLoadingLogout(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoadingLogout(false); // Reset loading state on error
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full text-left"
            aria-label={`Benutzermenü für ${isLoadingUser ? 'Benutzer' : userName}`}
            aria-describedby="user-menu-description"
            aria-expanded="false"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={"/placeholder-user.jpg"} 
                alt={`Profilbild von ${userName}`}
              />
              <AvatarFallback 
                className="bg-accent text-accent-foreground"
                aria-label={`Initialen: ${userInitials}`}
              >
                {isLoadingUser ? "" : userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span 
                className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                aria-label={`Benutzername: ${isLoadingUser ? 'Wird geladen' : userName}`}
              >
                {isLoadingUser ? "Lade..." : userName}
              </span>
              <span 
                className="text-xs text-gray-500 dark:text-gray-400 truncate"
                aria-label={`E-Mail: ${isLoadingUser ? '' : userEmail}`}
              >
                {isLoadingUser ? "" : userEmail}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 ml-4"
          aria-label="Benutzermenü-Optionen"
        >
          <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setIsTemplatesModalOpen(true)}
            className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
            aria-describedby="templates-menu-description"
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Vorlagen</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setOpenModal(true)}
            className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
            aria-describedby="settings-menu-description"
          >
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout} 
            disabled={isLoadingLogout}
            className="focus:bg-accent focus:text-accent-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-describedby="logout-menu-description"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Hidden descriptions for screen readers */}
      <div id="user-menu-description" className="sr-only">
        Öffnet das Benutzermenü mit Optionen für Vorlagen, Einstellungen und Abmelden
      </div>
      <div id="templates-menu-description" className="sr-only">
        Öffnet die Vorlagenverwaltung zum Erstellen, Bearbeiten und Organisieren von Dokumentvorlagen
      </div>
      <div id="settings-menu-description" className="sr-only">
        Öffnet die Benutzereinstellungen zum Anpassen Ihres Profils und Ihrer Präferenzen
      </div>
      <div id="logout-menu-description" className="sr-only">
        Meldet Sie von Ihrem Konto ab und kehrt zur Anmeldeseite zurück
      </div>
      
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
      <TemplatesManagementModal 
        open={isTemplatesModalOpen} 
        onOpenChange={setIsTemplatesModalOpen} 
      />
    </>
  )
}
