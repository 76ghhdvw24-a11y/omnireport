'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function LandingFooter() {
  const t = useTranslations('landing');

  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">OmniReport</span>
            <span className="text-xl font-bold text-blue-500">AI</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="#como-funciona" className="hover:text-white transition-colors">
              {t('howTitle')}
            </a>
            <a href="#funcionalidades" className="hover:text-white transition-colors">
              {t('featuresTitle')}
            </a>
            <a href="#precios" className="hover:text-white transition-colors">
              {t('pricingTitle')}
            </a>
            <Link href="/login" className="hover:text-white transition-colors">
              {t('login')}
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
          <p>© {new Date().getFullYear()} OmniReport AI. {t('footerRights')}</p>
        </div>
      </div>
    </footer>
  );
}
