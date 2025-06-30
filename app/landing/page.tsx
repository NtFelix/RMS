'use client';

import Hero from '../modern/components/hero';
import Features from '../modern/components/features';
import Services from '../modern/components/services';
import Testimonials from '../modern/components/testimonials';
import CTA from '../modern/components/cta';
import Footer from '../modern/components/footer';
import Navigation from '../modern/components/navigation';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  
  // Redirect to login when CTA is clicked
  const handleGetStarted = () => {
    router.push('/auth/login');
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
        <div id="hero">
          <Hero onGetStarted={handleGetStarted} />
        </div>
        <div id="features">
          <Features />
        </div>
        <div id="services">
          <Services />
        </div>
        <div id="testimonials">
          <Testimonials />
        </div>
        <div id="cta">
          <CTA onGetStarted={handleGetStarted} />
        </div>
        <Footer />
      </main>
    </>
  );
}
