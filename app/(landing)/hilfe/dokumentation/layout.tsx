import { Metadata } from 'next';
import { AIAssistantModal } from '@/components/ai-assistant-modal';

export const metadata: Metadata = {
  title: 'Dokumentation | Mietfluss',
  description: 'Umfassende Dokumentation und Hilfe für die Mietfluss Plattform',
  openGraph: {
    title: 'Dokumentation | Mietfluss',
    description: 'Umfassende Dokumentation und Hilfe für die Mietfluss Plattform',
    type: 'website',
    url: 'https://mietfluss.de/dokumentation',
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
    canonical: 'https://mietfluss.de/dokumentation',
  },
};

interface DocumentationLayoutProps {
  children: React.ReactNode;
}

export default function DocumentationLayout({ children }: DocumentationLayoutProps) {
  return (
    <>
      {/* Main Content */}
      <main className="flex-1 pt-20 sm:pt-24 bg-background">
        {children}
      </main>
      
      {/* AI Assistant Modal */}
      <AIAssistantModal />
    </>
  );
}