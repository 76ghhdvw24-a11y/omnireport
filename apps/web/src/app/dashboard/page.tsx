'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatCurrency';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  FileText, Plus, Loader2, Search, ChevronLeft, ChevronRight,
  TrendingUp, CheckCircle, DollarSign, BarChart3,
  Filter,
} from 'lucide-react';

interface Report {
  id: string;
  title: string;
  status: string;
  severity: string | null;
  createdAt: string;
  updatedAt: string;
  clientId?: string | null;
  total?: number | null;
  currency?: string | null;
  clientName?: string | null;
}

interface DashboardStats {
  totalReports: number;
  thisMonthReports: number;
  approvedReports: number;
  approvalRate: number;
  totalValue: number;
  statusDistribution: Record<string, number>;
  severityDistribution: Record<string, number>;
}

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchStats();
    fetchReports();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchReports();
  }, [page, statusFilter, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/v1/reports/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error al cargar estadísticas', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      params.set('take', String(PAGE_SIZE));
      params.set('skip', String(page * PAGE_SIZE));
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      const res = await api.get(`/api/v1/reports?${params.toString()}`);
      const newItems: Report[] = res.data.items;

      // Detect completed/failed reports and notify
      newItems.forEach((r) => {
        const prev = reports.find((p) => p.id === r.id);
        if (prev && ['PENDING','PROCESSING','TRANSCRIBING','ANALYZING'].includes(prev.status)) {
          if (r.status === 'COMPLETED') {
            toast.success('Presupuesto listo', {
              description: r.title,
              action: { label: 'Ver', onClick: () => window.location.href = `/reports/${r.id}` },
            });
          } else if (r.status === 'FAILED') {
            toast.error('Error en presupuesto', {
              description: r.title,
              action: { label: 'Ver', onClick: () => window.location.href = `/reports/${r.id}` },
            });
          }
        }
      });

      setReports(newItems);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error al cargar presupuestos', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchReports();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-200 text-gray-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      TRANSCRIBING: 'bg-blue-100 text-blue-800',
      ANALYZING: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      DRAFT: 'bg-amber-100 text-amber-800',
      APPROVED: 'bg-emerald-100 text-emerald-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-200 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const key = `status.${status}` as const;
    return t.has(key) ? t(key) : status;
  };

  const getSeverityLabel = (severity: string | null) => {
    if (!severity) return '';
    const key = `severity.${severity}` as const;
    return t.has(key) ? t(key) : severity;
  };

  const getSeverityColor = (severity: string | null) => {
    const colors: Record<string, string> = {
      CRITICAL: 'text-red-600 font-bold', HIGH: 'text-orange-600 font-semibold',
      MEDIUM: 'text-yellow-600', LOW: 'text-blue-600', INFO: 'text-gray-500',
    };
    return colors[severity || ''] || 'text-gray-400';
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.totalBudgets')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalReports ?? 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.thisMonth')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.thisMonthReports ?? 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.approvalRate')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : `${stats?.approvalRate ?? 0}%`}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.totalValue')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? <Loader2 className="w-5 h-5 animate-spin" /> : formatCurrency(stats?.totalValue ?? 0, 'CLP')}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('dashboard.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                {t('dashboard.search')}
              </button>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="text-sm border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">{t('dashboard.allStatuses')}</option>
                <option value="PENDING">{t('dashboard.pending')}</option>
                <option value="PROCESSING">{t('dashboard.processing')}</option>
                <option value="COMPLETED">{t('dashboard.completed')}</option>
                <option value="DRAFT">{t('dashboard.draft')}</option>
                <option value="APPROVED">{t('dashboard.approved')}</option>
                <option value="FAILED">{t('dashboard.failed')}</option>
              </select>

              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                  setPage(0);
                }}
                className="text-sm border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="createdAt:desc">{t('dashboard.newest')}</option>
                <option value="createdAt:asc">{t('dashboard.oldest')}</option>
                <option value="title:asc">{t('dashboard.titleAZ')}</option>
                <option value="title:desc">{t('dashboard.titleZA')}</option>
                <option value="status:asc">{t('dashboard.byStatus')}</option>
                <option value="severity:desc">{t('dashboard.bySeverity')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('dashboard.title')}</h2>
          <div className="text-sm text-gray-500">
            {total} {t('dashboard.results')}
          </div>
        </div>

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{t('dashboard.noBudgets')}</p>
            <Link href="/reports/new" className="text-sm mt-2 inline-block text-blue-600 hover:underline">
              {t('dashboard.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-100">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{report.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString()}
                        {report.clientName && ` · ${report.clientName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {report.severity && (
                      <span className={`text-xs ${getSeverityColor(report.severity)}`}>
                        {getSeverityLabel(report.severity)}
                      </span>
                    )}
                    {report.total != null && (
                      <span className="text-xs text-gray-500">
                        {formatCurrency(report.total, report.currency)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> {t('dashboard.previous')}
                </button>
                <span className="text-sm text-gray-500">
                  {t('dashboard.page')} {page + 1} {t('dashboard.of')} {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('dashboard.next')} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
