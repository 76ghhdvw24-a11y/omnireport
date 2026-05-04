'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function PricingSection() {
  const t = useTranslations('landing');

  const plans = [
    {
      name: t('planFree'),
      price: '$0',
      period: '/mes',
      description: t('planFreeDesc'),
      features: [
        '10 reportes',
        '1 GB de almacenamiento',
        'IA multimodal básica',
        'PDF profesional',
        'Soporte por email',
      ],
      cta: t('planCta'),
      href: '/register',
      highlighted: false,
    },
    {
      name: t('planPro'),
      price: '—',
      period: '',
      description: t('planProDesc'),
      features: [
        '100 reportes',
        '10 GB de almacenamiento',
        'IA multimodal avanzada',
        'PDF con branding personalizado',
        'Chat IA ilimitado',
        'Gestión de equipo',
        'Soporte prioritario',
      ],
      cta: t('planCtaContact'),
      href: '/register',
      highlighted: true,
    },
    {
      name: t('planEnterprise'),
      price: '—',
      period: '',
      description: t('planEnterpriseDesc'),
      features: [
        'Reportes ilimitados',
        '100 GB de almacenamiento',
        'IA multimodal avanzada',
        'API access',
        'SSO y roles avanzados',
        'Onboarding dedicado',
        'SLA garantizado',
      ],
      cta: t('planCtaContact'),
      href: '/register',
      highlighted: false,
    },
  ];

  return (
    <section id="precios" className="bg-white py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('pricingTitle')}</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            {t('pricingSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-gray-200 ${
                plan.highlighted
                  ? 'border-blue-600 shadow-lg ring-1 ring-blue-600'
                  : 'hover:shadow-md transition-shadow'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
                    {t('popularBadge')}
                  </span>
                </div>
              )}
              <CardHeader className="pb-2 pt-7 px-6">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500 ml-1">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-7">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants(),
                    'w-full mt-6',
                    plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  )}
                >
                  {plan.cta}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
