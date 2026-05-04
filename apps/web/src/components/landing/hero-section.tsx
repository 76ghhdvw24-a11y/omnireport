'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const t = useTranslations('landing');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-gray-50 to-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
        <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          {t('heroBadge')}
        </Badge>

        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
          {t('heroTitle1')}
          <br className="hidden md:block" />
          <span className="text-blue-600"> {t('heroTitle2')}</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {t('heroSubtitle')}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base'
            )}
          >
            {t('heroCtaPrimary')} <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <a
            href="#como-funciona"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'px-8 h-12 text-base border-gray-300'
            )}
          >
            {t('heroCtaSecondary')}
          </a>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          {t('heroNote')}
        </p>
      </div>
    </section>
  );
}
