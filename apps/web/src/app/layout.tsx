import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/components/i18n-provider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'OmniReport AI - Technical Report Generation',
  description: 'Automated technical report generation using multimodal AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}