'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { formatCurrency } from '@/lib/formatCurrency';

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
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchReports();
  }, [user, authLoading, router, statusFilter]);

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      params.set('take', '50');
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/api/v1/reports?${params.toString()}`);
      setReports(res.data.items);
    } catch (err) {
      console.error('Error al cargar presupuestos', err);
    } finally {
      setIsLoadingReports(false);
    }
  };

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
    const labels: Record<string, string> = {
      PENDING: 'Pendiente', PROCESSING: 'Procesando', TRANSCRIBING: 'Transcribiendo',
      ANALYZING: 'Analizando', COMPLETED: 'Completado', DRAFT: 'Borrador',
      APPROVED: 'Aprobado', FAILED: 'Fallido',
    };
    return labels[status] || status;
  };

  const getSeverityColor = (severity: string | null) => {
    const colors: Record<string, string> = {
      CRITICAL: 'text-red-600 font-bold', HIGH: 'text-orange-600 font-semibold',
      MEDIUM: 'text-yellow-600', LOW: 'text-blue-600', INFO: 'text-gray-500',
    };
    return colors[severity || ''] || 'text-gray-400';
  };

  if (authLoading) {
    return (<main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>);
  }
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Mis Presupuestos</h2>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setIsLoadingReports(true); }} className="text-sm border border-gray-300 rounded-md px-3 py-1.5">
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PROCESSING">Procesando</option>
            <option value="COMPLETED">Completado</option>
            <option value="DRAFT">Borrador</option>
            <option value="APPROVED">Aprobado</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>
        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aún no hay presupuestos</p>
            <Link href="/reports/new" className="text-sm mt-2 inline-block text-blue-600 hover:underline">Crear primer presupuesto</Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-100">
              {reports.map((report) => (
                <Link key={report.id} href={`/reports/${report.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{report.title}</p>
                      <p className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {report.severity && <span className={`text-xs ${getSeverityColor(report.severity)}`}>{report.severity}</span>}
                    {report.total != null && <span className="text-xs text-gray-500">{formatCurrency(report.total, report.currency)}</span>}
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>{getStatusLabel(report.status)}</span>
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