"use client"

import React, { useState, useEffect } from "react";
import AuthModal from "@/components/auth-modal";

export default function AuthModalProvider() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    (window as any).openAuthModal = (tab: 'login' | 'register') => {
      setAuthModalInitialTab(tab);
      setIsAuthModalOpen(true);
    };
  }, []);

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        onAuthenticated={() => {
          // This can be used for any logic that needs to run after authentication is successful
          // For example, refetching data or redirecting.
          // The onAuthStateChange listener already handles the main logic of fetching the user profile.
          window.location.reload();
        }}
        initialTab={authModalInitialTab}
      />
    </>
  );
}
