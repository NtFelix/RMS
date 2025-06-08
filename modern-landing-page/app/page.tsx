import Hero from "../components/hero"
import Features from "../components/features"
import Services from "../components/services"
import Testimonials from "../components/testimonials"
import CTA from "../components/cta"
import Footer from "../components/footer"
import Navigation from "../components/navigation"

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
        <div id="hero">
          <Hero />
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
          <CTA />
        </div>
        <Footer />
      </main>
    </>
  )
}
