"use client"

import React, { useState, createContext, useContext, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import AuthModal from "@/components/auth/auth-modal";
import { ROUTES } from "@/lib/constants";

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
function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((tab: 'login' | 'register') => {
    setAuthModalInitialTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    // Clear auth intent if modal is closed without authentication
    try {
      sessionStorage.removeItem('authIntent');
    } catch (e) {
      console.warn('SessionStorage not available');
    }
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
          // Check if user clicked "Jetzt loslegen" and redirect to dashboard
          let authIntent = null;
          try {
            authIntent = sessionStorage.getItem('authIntent');
            if (authIntent === 'get-started') {
              sessionStorage.removeItem('authIntent');
            }
          } catch (e) {
            console.warn('SessionStorage not available');
          }

          if (authIntent === 'get-started') {
            router.push(ROUTES.HOME);
          } else {
            // For regular login (Anmelden button), stay on current page
            router.refresh();
          }
        }}
        initialTab={authModalInitialTab}
      />
    </AuthModalContext.Provider>
  );
}

export default AuthModalProvider;
