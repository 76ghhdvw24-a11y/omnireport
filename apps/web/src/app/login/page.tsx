'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to login';
      setError(message);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-md rounded-lg shadow-lg p-8" style={{ backgroundColor: '#ffffff' }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#111827' }}>OmniReport AI</h1>
        <h2 className="text-lg font-medium mb-4" style={{ color: '#374151' }}>Sign In</h2>

        {error && (
          <div className="mb-4 p-3 rounded-md text-sm" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#111827', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#111827', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
              required
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-md font-medium disabled:opacity-50"
            style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: '#6b7280' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#2563eb' }} className="hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}