"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useModalStore } from "@/hooks/use-modal-store";
import { ARIA_LABELS, KEYBOARD_SHORTCUTS } from "@/lib/accessibility-constants";
import { useFeatureFlagEnabled } from "posthog-js/react";

export function UserSettings() {
  const router = useRouter();
  const [isLoadingLogout, setIsLoadingLogout] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [userName, setUserName] = useState("Lade...");
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("");
  const supabase = createClient();
  const { openTemplatesModal } = useModalStore();
  // Temporarily disable templates to prevent infinite re-render until PostHog issue is resolved
  const templateModalEnabled = false

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
  }, []); // Remove supabase from dependency array to prevent infinite re-renders


  const handleLogout = async () => {
    setIsLoadingLogout(true);
    try {
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
      {/* Temporarily disabled DropdownMenu due to infinite re-render issue with Radix UI */}
      <div
        className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
        aria-label="User menu"
        onClick={() => setOpenModal(true)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={"/placeholder-user.jpg"} alt={userName} />
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
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
