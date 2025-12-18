import { NKCarousel } from "@/components/nk-carousel";

export default function NebenkostenSection() {
  return (
    <section id="nebenkosten" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Typische Herausforderungen – gelöst mit <span className="text-primary">Mietevo</span></h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Konzentrieren Sie sich auf das Wesentliche: weniger Fehler, weniger Rückfragen, mehr Nachvollziehbarkeit.
          </p>
        </div>

        <NKCarousel />
      </div>
    </section>
  );
}
