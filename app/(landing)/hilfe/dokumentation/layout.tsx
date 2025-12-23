import { Metadata } from 'next';
import { AIAssistantModal } from '@/components/ai/ai-assistant-modal';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.dokumentation;

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