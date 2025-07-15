"use client"

import React, { useState, createContext, useContext, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import AuthModal from "@/components/auth-modal";

// Define the context type
interface AuthModalContextType {
  openAuthModal: (tab: 'login' | 'register') => void;
  closeAuthModal: () => void;
  isOpen: boolean;
}

// Create the context
const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

// Custom hook to use the auth modal context
export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

// Provider component
export default function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((tab: 'login' | 'register') => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const contextValue = useMemo(() => ({
    openAuthModal,
    closeAuthModal,
    isOpen: isAuthModalOpen,
  }), [isAuthModalOpen, openAuthModal, closeAuthModal]);

  return (
    <AuthModalContext.Provider value={contextValue}>
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onAuthenticated={() => {
          // This can be used for any logic that needs to run after authentication is successful
          // For example, refetching data or redirecting.
          // The onAuthStateChange listener already handles the main logic of fetching the user profile.
          router.refresh();
        }}
        initialTab={authModalInitialTab}
      />
    </AuthModalContext.Provider>
  );
}
