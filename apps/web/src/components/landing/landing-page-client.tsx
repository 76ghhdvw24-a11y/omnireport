'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LandingNav } from './landing-nav';
import { HeroSection } from './hero-section';
import { HowItWorksSection } from './how-it-works-section';
import { FeaturesSection } from './features-section';
import { PricingSection } from './pricing-section';
import { CtaSection } from './cta-section';
import { LandingFooter } from './landing-footer';

export function LandingPageClient() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500">Cargando...</p>
        </div>
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <>
      <LandingNav />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <CtaSection />
      <LandingFooter />
    </>
  );
}
