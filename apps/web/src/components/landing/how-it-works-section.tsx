'use client';

import { Camera, Brain, FileCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export function HowItWorksSection() {
  const t = useTranslations('landing');

  const steps = [
    {
      icon: Camera,
      number: '01',
      title: t('step1Title'),
      description: t('step1Desc'),
    },
    {
      icon: Brain,
      number: '02',
      title: t('step2Title'),
      description: t('step2Desc'),
    },
    {
      icon: FileCheck,
      number: '03',
      title: t('step3Title'),
      description: t('step3Desc'),
    },
  ];

  return (
    <section id="como-funciona" className="bg-white py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('howTitle')}</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            {t('howSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <Card key={step.number} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-8 px-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                  <step.icon className="w-7 h-7 text-blue-600" />
                </div>
                <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">
                  Paso {step.number}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
