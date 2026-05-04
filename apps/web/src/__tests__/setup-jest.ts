import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useTranslations: () => (key: string) => key,
  useLocale: () => 'es',
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN' as const,
      organizationId: 'org-1',
      isActive: true,
    },
    logout: jest.fn(),
    loading: false,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));