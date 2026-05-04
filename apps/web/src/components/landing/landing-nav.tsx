'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function LandingNav() {
  const t = useTranslations('landing');
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '#como-funciona', label: t('howTitle') },
    { href: '#funcionalidades', label: t('featuresTitle') },
    { href: '#precios', label: t('pricingTitle') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          OmniReport <span className="text-blue-600">AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {t('login')}
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-blue-600 hover:bg-blue-700 text-white')}
          >
            {t('register')}
          </Link>
        </div>

        <button
          className="md:hidden text-gray-600"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-3 space-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
            >
              {t('login')}
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className={cn(buttonVariants({ size: 'sm' }), 'w-full bg-blue-600 hover:bg-blue-700 text-white')}
            >
              {t('register')}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
