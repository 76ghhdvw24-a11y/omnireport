'use client';

import { useEffect, useState, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

const loadMessages = async (locale: string) => {
  switch (locale) {
    case 'en':
      return (await import('../../messages/en.json')).default;
    case 'pt':
      return (await import('../../messages/pt.json')).default;
    default:
      return (await import('../../messages/es.json')).default;
  }
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null);
  const [locale, setLocale] = useState('es');

  useEffect(() => {
    const stored = localStorage.getItem('locale');
    const userLocale = stored || 'es';
    setLocale(userLocale);
    loadMessages(userLocale).then(setMessages);
  }, []);

  const changeLocale = (newLocale: string) => {
    localStorage.setItem('locale', newLocale);
    setLocale(newLocale);
    loadMessages(newLocale).then(setMessages);
  };

  if (!messages) return <>{children}</>;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <I18nContext.Provider value={{ locale, changeLocale }}>
        {children}
      </I18nContext.Provider>
    </NextIntlClientProvider>
  );
}

import { createContext, useContext } from 'react';

interface I18nContextType {
  locale: string;
  changeLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextType>({ locale: 'es', changeLocale: () => {} });

export function useLocale() {
  return useContext(I18nContext);
}
