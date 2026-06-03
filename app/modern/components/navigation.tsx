"use client"

import { useState, useEffect, useCallback, useSyncExternalStore } from "react"
import { Menu } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LOGO_URL, BRAND_NAME_PART_1, BRAND_NAME_PART_2 } from "@/lib/constants"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import { PillContainer } from "@/components/ui/pill-container"
import { useIsOverflowing } from "@/hooks/use-responsive"
import {
  trackNavLoginClicked,
  trackNavRegisterClicked,
  trackNavLogoutClicked,
  trackNavMobileMenuOpened,
} from "@/lib/posthog-landing-events"
import { useFeatureFlagEnabled } from "posthog-js/react"

import { DesktopNavigation } from "./navigation/DesktopNavigation"
import { MobileNavigation } from "./navigation/MobileNavigation"

interface NavigationProps {
  onLogin?: () => void;
}

const emptySubscribe = () => () => {};

export default function Navigation({ onLogin }: NavigationProps) {
  const hasMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { ref: navRef, isOverflowing } = useIsOverflowing();
  const showProdukte = useFeatureFlagEnabled('show-produkte-dropdown');
  const showLoesungen = useFeatureFlagEnabled('show-loesungen-dropdown');

  const checkIfMobile = useCallback(() => {
    if (typeof window === 'undefined' || !hasMounted) return;
    const isSmallScreen = window.innerWidth < 768;
    const shouldUseMobile = isSmallScreen || isOverflowing;
    setIsMobile(shouldUseMobile);
  }, [isOverflowing, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;

    checkIfMobile();

    const handleResize = () => {
      checkIfMobile();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkIfMobile, hasMounted]);

  useEffect(() => {
    const supabase = createClient();
    
    // Set initial user synchronously if possible, otherwise use onAuthStateChange
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleOpenLoginModal = () => {
    trackNavLoginClicked();
    if (onLogin) {
      onLogin();
    } else {
      router.push('/auth/login');
    }
  };

  const handleLogout = async () => {
    trackNavLogoutClicked();
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }

    try {
      // Perform cleanup API calls
      await Promise.allSettled([
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true
        }),
        fetch('/api/auth/clear-auth-cookie', {
          method: 'POST',
          credentials: 'same-origin',
          keepalive: true
        })
      ]);
    } catch (error) {
      console.error("Error clearing session:", error);
    } finally {
      setCurrentUser(null);
      setIsOpen(false);
      window.location.replace("/");
    }
  };

  const handleRegisterClick = () => {
    trackNavRegisterClicked();
    router.push('/auth/register');
  };

  if (!hasMounted) {
    return <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4 h-16"></nav>;
  }

  return (
    <nav className="fixed top-2 sm:top-4 left-0 right-0 z-50 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header with Menu Button and Logo */}
        {(isMobile || isOverflowing) && (
          <div className="flex items-center gap-2">
            <PillContainer>
              <button
                type="button"
                onClick={() => {
                  if (!isOpen) trackNavMobileMenuOpened();
                  setIsOpen(!isOpen);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-200 hover:text-foreground dark:btn-ghost-hover transition-colors duration-200 flex items-center gap-2"
              >
                <Menu className="size-5" />
                <span className="text-sm font-medium">Menü</span>
              </button>
            </PillContainer>
            <Link href="/" className="flex items-center gap-1 group">
              <div className="relative size-6 rounded-full group-hover:scale-110 transition-transform overflow-hidden">
                <Image
                  src={LOGO_URL}
                  alt="Mietevo Logo"
                  fill
                  sizes="24px"
                  className="object-cover"
                  unoptimized // Supabase images are stored as pre-optimized .avif
                />
              </div>
              <span className="text-base font-bold text-foreground group-hover:text-foreground/80 transition-colors">
                <span className="text-primary">{BRAND_NAME_PART_1}</span>{BRAND_NAME_PART_2}
              </span>
            </Link>
          </div>
        )}

        {/* Desktop Navigation */}
        {!isMobile && !isOverflowing && (
          <DesktopNavigation
            navRef={navRef}
            showProdukte={showProdukte ?? false}
            showLoesungen={showLoesungen ?? false}
            currentUser={currentUser}
            handleLogout={handleLogout}
            handleOpenLoginModal={handleOpenLoginModal}
            handleRegisterClick={handleRegisterClick}
          />
        )}
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        showProdukte={showProdukte ?? false}
        showLoesungen={showLoesungen ?? false}
        currentUser={currentUser}
        handleLogout={handleLogout}
        handleOpenLoginModal={handleOpenLoginModal}
      />
    </nav>
  )
}
