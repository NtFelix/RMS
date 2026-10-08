import Navigation from '@/app/modern/components/navigation';
import Footer from '@/app/modern/components/footer';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import { HomePageJsonLd } from '@/components/seo/json-ld';

import { Suspense } from 'react';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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

