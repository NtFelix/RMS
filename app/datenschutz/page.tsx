import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Informationen zum Datenschutz',
};

export default function DatenschutzPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Datenschutzerklärung</h1>
      <div className="prose dark:prose-invert">
        <p>Diese Seite wird in Kürze mit Inhalten gefüllt.</p>
      </div>
    </div>
  );
}
