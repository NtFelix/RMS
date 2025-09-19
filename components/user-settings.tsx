"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/custom-dropdown"
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
  // Use PostHog feature flag properly at the top level
  const templateModalEnabled = useFeatureFlagEnabled('template-modal-enabled')

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
      <CustomDropdown
        align="end"
        className="w-56 ml-4"
        trigger={
          <div
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            aria-label="User menu"
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
        }
      >
        <CustomDropdownLabel>Mein Konto</CustomDropdownLabel>
        <CustomDropdownSeparator />
        {templateModalEnabled && (
          <CustomDropdownItem 
            onClick={openTemplatesModal}
            aria-label={ARIA_LABELS.templatesModal}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Vorlagen</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownItem onClick={() => setOpenModal(true)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Einstellungen</span>
        </CustomDropdownItem>
        <CustomDropdownSeparator />
        <CustomDropdownItem onClick={handleLogout} disabled={isLoadingLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoadingLogout ? "Wird abgemeldet..." : "Abmelden"}</span>
        </CustomDropdownItem>
      </CustomDropdown>
      <SettingsModal open={openModal} onOpenChange={setOpenModal} />
    </>
  )
}
