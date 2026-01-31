import Navigation from '@/app/modern/components/navigation';
import Footer from '@/app/modern/components/footer';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

