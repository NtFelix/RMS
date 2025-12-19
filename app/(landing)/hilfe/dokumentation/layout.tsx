import { Metadata } from 'next';
import { AIAssistantModal } from '@/components/ai-assistant-modal';

export const metadata: Metadata = {
  title: 'Dokumentation | Mietevo',
  description: 'Umfassende Dokumentation und Hilfe für die Mietevo Plattform',
  openGraph: {
    title: 'Dokumentation | Mietevo',
    description: 'Umfassende Dokumentation und Hilfe für die Mietevo Plattform',
    type: 'website',
    url: 'https://mietevo.de/dokumentation',
    siteName: 'Mietevo',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary',
    title: 'Dokumentation | Mietevo',
    description: 'Umfassende Dokumentation und Hilfe für die Mietevo Plattform',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://mietevo.de/dokumentation',
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