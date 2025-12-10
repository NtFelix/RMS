import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description: 'Allgemeine Geschäftsbedingungen für die Nutzung von Mietfluss',
};

export default function AGBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}