'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { FileText, Plus, Settings, Users, LogOut, Menu, X, MessageSquare, LayoutTemplate, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

const getNavItems = (t: (key: string) => string) => [
  { href: '/dashboard', label: t('nav.budgets'), icon: FileText },
  { href: '/clients', label: t('nav.clients'), icon: Users },
  { href: '/templates', label: t('nav.templates'), icon: LayoutTemplate },
  { href: '/settings', label: t('nav.settings'), icon: Settings },
];

export function NavBar() {
  const t = useTranslations();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = getNavItems(t);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            OmniReport
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <Icon className="w-4 h-4" />{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
<div className="flex items-center gap-2">
            <Link href="/reports/new" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />{t('nav.new')}
            </Link>
            <Link href="/reports/new/chat" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
              <MessageSquare className="w-4 h-4" />{t('nav.withAI')}
            </Link>
          </div>
          <Link href="/profile" className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <UserCircle className="w-4 h-4" />
            <span>{user.firstName}</span>
          </Link>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title={t('nav.logout')}>
            <LogOut className="w-4 h-4" />
          </button>
          <button className="md:hidden text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden border-t border-gray-100 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                <Icon className="w-4 h-4" />{item.label}
              </Link>
            );
          })}
          <Link href="/reports/new" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-blue-600">
            <Plus className="w-4 h-4" />{t('nav.new')}
          </Link>
          <Link href="/reports/new/chat" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-purple-600">
            <MessageSquare className="w-4 h-4" />{t('nav.withAI')}
          </Link>
        </nav>
      )}
    </header>
  );
}