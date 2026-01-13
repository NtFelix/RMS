import Navigation from '@/app/modern/components/navigation';
import Footer from '@/app/modern/components/footer';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import AuthModalProvider from '@/components/auth/auth-modal-provider';

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <AuthModalProvider>
                <div className="min-h-screen flex flex-col">
                    <Navigation />
                    <main className="flex-1">
                        {children}
                    </main>
                    <Footer />
                    <Toaster />
                </div>
            </AuthModalProvider>
        </ThemeProvider>
    );
}
