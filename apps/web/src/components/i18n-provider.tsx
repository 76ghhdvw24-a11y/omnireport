'use client';

import { useEffect, useState, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import defaultMessages from '../../messages/es.json';

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
  const [messages, setMessages] = useState<Record<string, unknown>>(defaultMessages);
  const [locale, setLocale] = useState('es');

  useEffect(() => {
    const stored = localStorage.getItem('locale');
    const userLocale = stored || 'es';
    if (userLocale !== locale) {
      setLocale(userLocale);
      loadMessages(userLocale).then(setMessages);
    }
  }, []);

  const changeLocale = (newLocale: string) => {
    localStorage.setItem('locale', newLocale);
    setLocale(newLocale);
    loadMessages(newLocale).then(setMessages);
  };

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
