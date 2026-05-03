'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
        <p className="mt-3" style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    </main>
  );
}