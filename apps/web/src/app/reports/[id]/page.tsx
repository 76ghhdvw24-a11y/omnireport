'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from 'lucide-react';

interface Finding {
  description: string;
  severity: string;
  confidence: number;
  component?: string;
  condition?: string;
}

interface Report {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string | null;
  audioTranscript: string | null;
  findings: Finding[] | null;
  executiveSummary: string | null;
  recommendedAction: string | null;
  aiModel: string | null;
  aiResponseTime: number | null;
  createdAt: string;
  completedAt: string | null;
  imageUrls: string[];
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  useEffect(() => {
    if (!report) return;
    if (report.status === 'COMPLETED' || report.status === 'FAILED') return;

    const interval = setInterval(() => {
      fetchReport();
    }, 3000);

    return () => clearInterval(interval);
  }, [report?.status, id]);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/api/v1/reports/${id}`);
      setReport(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const res = await api.get(`/api/v1/reports/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report?.title || 'report'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate PDF');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-gray-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-700 border-blue-200',
      INFO: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">{error || 'Report not found'}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isProcessing = !['COMPLETED', 'FAILED'].includes(report.status);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{report.title}</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(report.status)}
              <span className="font-medium text-gray-900">{report.status}</span>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(report.createdAt).toLocaleString()}
            </div>
          </div>

          {report.description && (
            <p className="text-gray-600 mb-4">{report.description}</p>
          )}

          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-900">Processing your report...</p>
                <p className="text-sm text-blue-700">
                  This may take a few minutes depending on the media size.
                </p>
              </div>
            </div>
          )}
        </div>

        {report.imageUrls.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {report.imageUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square bg-gray-100 rounded-md overflow-hidden hover:opacity-90"
                >
                  <img
                    src={url}
                    alt={`Report image ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {report.audioTranscript && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Audio Transcript</h3>
            <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {report.audioTranscript}
            </div>
          </div>
        )}

        {report.executiveSummary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Executive Summary</h3>
            <p className="text-gray-700 leading-relaxed">{report.executiveSummary}</p>
          </div>
        )}

        {report.findings && report.findings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Findings</h3>
            <div className="space-y-3">
              {report.findings.map((finding, i) => (
                <div
                  key={i}
                  className={`border rounded-md p-4 ${getSeverityColor(finding.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold text-sm uppercase tracking-wide">
                          {finding.severity}
                        </span>
                        {finding.component && (
                          <span className="text-xs opacity-75">• {finding.component}</span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{finding.description}</p>
                    </div>
                    <div className="text-xs opacity-75 ml-4 whitespace-nowrap">
                      {Math.round(finding.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.recommendedAction && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Recommended Action</h3>
            <p className="text-gray-700 leading-relaxed">{report.recommendedAction}</p>
          </div>
        )}

        {report.status === 'COMPLETED' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Analyzed with {report.aiModel || 'AI'} in{' '}
                {report.aiResponseTime ? `${report.aiResponseTime}ms` : 'N/A'}
              </div>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
