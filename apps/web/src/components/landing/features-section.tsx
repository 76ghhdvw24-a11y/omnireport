'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  DollarSign,
  FileText,
  MessageSquare,
  Globe,
  Shield,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function FeaturesSection() {
  const t = useTranslations('landing');

  const features = [
    {
      icon: Brain,
      title: t('featMultimodal'),
      description: t('featMultimodalDesc'),
      badge: 'NVIDIA Gemma',
    },
    {
      icon: DollarSign,
      title: t('featCosts'),
      description: t('featCostsDesc'),
    },
    {
      icon: FileText,
      title: t('featPdf'),
      description: t('featPdfDesc'),
    },
    {
      icon: MessageSquare,
      title: t('featChat'),
      description: t('featChatDesc'),
      badge: 'Nuevo',
    },
    {
      icon: Globe,
      title: t('featLang'),
      description: t('featLangDesc'),
    },
    {
      icon: Shield,
      title: t('featSecurity'),
      description: t('featSecurityDesc'),
    },
  ];

  return (
    <section id="funcionalidades" className="bg-gray-50 py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('featuresTitle')}</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            {t('featuresSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <CardContent className="pt-7 pb-7 px-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  {feature.badge && (
                    <Badge variant="outline" className="text-xs font-medium text-purple-600 border-purple-200 bg-purple-50">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
