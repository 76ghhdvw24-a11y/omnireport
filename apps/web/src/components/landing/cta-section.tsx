'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function CtaSection() {
  const t = useTranslations('landing');

  return (
    <section className="bg-blue-600 py-16 md:py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          {t('ctaTitle')}
        </h2>
        <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
          {t('ctaSubtitle')}
        </p>
        <div className="mt-8">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-white text-blue-600 hover:bg-blue-50 px-8 h-12 text-base font-semibold'
            )}
          >
            {t('ctaButton')} <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
