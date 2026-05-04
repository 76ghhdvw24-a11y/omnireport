import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/landing-page-client';

export const metadata: Metadata = {
  title: 'OmniReport AI — Presupuestos técnicos con IA',
  description:
    'Genera presupuestos de inspección técnica automáticamente con IA multimodal. Fotos, audio y PDF profesional en minutos.',
  keywords: ['presupuestos técnicos', 'IA', 'inspección', 'PDF', 'omnireport', 'automatización'],
  openGraph: {
    title: 'OmniReport AI — Presupuestos técnicos con IA',
    description:
      'Genera presupuestos de inspección técnica automáticamente con IA multimodal.',
    type: 'website',
  },
};

export default function Home() {
  return <LandingPageClient />;
}
