'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { FileText, Plus, LogOut, Loader2 } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  status: string;
  severity: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchReports();
  }, [user, authLoading, router]);

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/v1/reports?take=50');
      setReports(res.data.items);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-200 text-gray-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      TRANSCRIBING: 'bg-blue-100 text-blue-800',
      ANALYZING: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const getSeverityColor = (severity: string | null) => {
    const colors: Record<string, string> = {
      CRITICAL: 'text-red-600 font-bold',
      HIGH: 'text-orange-600 font-semibold',
      MEDIUM: 'text-yellow-600',
      LOW: 'text-blue-600',
      INFO: 'text-gray-500',
    };
    return colors[severity || ''] || 'text-gray-400';
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#2563eb' }} />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>OmniReport AI</h1>
            <p className="text-sm" style={{ color: '#6b7280' }}>{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/reports/new"
              className="flex items-center gap-2 px-4 py-2 rounded-md font-medium"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              <Plus className="w-4 h-4" />
              New Report
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2"
              style={{ color: '#6b7280' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>Your Reports</h2>

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#2563eb' }} />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg shadow p-12 text-center" style={{ backgroundColor: '#ffffff' }}>
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: '#d1d5db' }} />
            <p style={{ color: '#6b7280' }}>No reports yet</p>
            <Link href="/reports/new" className="text-sm mt-2 inline-block" style={{ color: '#2563eb' }}>
              Create your first report
            </Link>
          </div>
        ) : (
          <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
            <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5" style={{ color: '#9ca3af' }} />
                    <div>
                      <p className="font-medium" style={{ color: '#111827' }}>{report.title}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {report.severity && (
                      <span className={`text-xs ${getSeverityColor(report.severity)}`}>
                        {report.severity}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}