import { Metadata } from 'next';
import Navigation from '@/app/modern/components/navigation';
import Footer from '@/app/modern/components/footer';
import AuthModalProvider from '@/components/auth-modal-provider';

export const metadata: Metadata = {
  title: 'Dokumentation | Mietfluss',
  description: 'Umfassende Dokumentation und Hilfe für die Mietfluss Plattform',
  openGraph: {
    title: 'Dokumentation | Mietfluss',
    description: 'Umfassende Dokumentation und Hilfe für die Mietfluss Plattform',
    type: 'website',
    url: 'https://mietfluss.de/documentation',
    siteName: 'Mietfluss',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary',
    title: 'Dokumentation | Mietfluss',
    description: 'Umfassende Dokumentation und Hilfe für die Mietfluss Plattform',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://mietfluss.de/documentation',
  },
};

interface DocumentationLayoutProps {
  children: React.ReactNode;
}

export default function DocumentationLayout({ children }: DocumentationLayoutProps) {
  return (
    <AuthModalProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Public Navigation */}
        <Navigation />
        
        {/* Main Content */}
        <main className="flex-1 pt-20 sm:pt-24">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </AuthModalProvider>
  );
}