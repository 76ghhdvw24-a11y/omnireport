/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/landing/hero-section';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'heroBadge': 'Nuevo: Análisis con IA',
      'heroTitle1': 'Informes técnicos',
      'heroTitle2': 'en minutos',
      'heroSubtitle': 'Crea informes profesionales de inspección y presupuestos en segundos con nuestra plataforma impulsada por IA.',
      'heroCtaPrimary': 'Comenzar gratis',
      'heroCtaSecondary': 'Ver cómo funciona',
      'heroNote': 'No se requiere tarjeta de crédito',
    };
    return translations[key] || key;
  },
}));

describe('HeroSection', () => {
  it('renders hero section with title', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Informes técnicos/)).toBeInTheDocument();
  });

  it('renders hero badge', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Nuevo: Análisis con IA/)).toBeInTheDocument();
  });

  it('renders primary CTA button', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Comenzar gratis/)).toBeInTheDocument();
  });

  it('renders secondary CTA button', () => {
    render(<HeroSection />);
    expect(screen.getByText(/Ver cómo funciona/)).toBeInTheDocument();
  });

  it('renders note about no credit card', () => {
    render(<HeroSection />);
    expect(screen.getByText(/No se requiere tarjeta de crédito/)).toBeInTheDocument();
  });

  it('has register link with correct href', () => {
    render(<HeroSection />);
    const link = screen.getByRole('link', { name: /Comenzar gratis/ });
    expect(link).toHaveAttribute('href', '/register');
  });
});