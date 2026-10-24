import Navigation from '@/app/modern/components/navigation';
import Footer from '@/app/modern/components/footer';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import { HomePageJsonLd } from '@/components/seo/json-ld';

import { Suspense } from 'react';

// Marketing pages must stay fully static: the build fails if request-time data (cookies, headers,
// uncached fetches) sneaks into any route under this layout. Remove or relax only on purpose.
// Note: `instant = false` in app/layout.tsx takes precedence, so this validation only takes
// effect once that root opt-out is removed.
export const ensureStatic = 'navigation';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HomePageJsonLd />
      <div className="min-h-screen flex flex-col">
        <Suspense fallback={null}>
          <Navigation />
        </Suspense>
        <main className="flex-1">
          {children}
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

