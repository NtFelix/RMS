import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { HomePageJsonLd } from '@/components/seo/json-ld';
import LandingClient from './landing-client';

export const metadata: Metadata = pageMetadata.home;

export default function LandingPage() {
  return (
    <>
      <HomePageJsonLd />
      <LandingClient />
    </>
  );
}
