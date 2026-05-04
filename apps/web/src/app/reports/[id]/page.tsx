'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api, uploadFiles } from '@/lib/api';
import { formatCurrency, formatNumberInput, getCurrencySymbol } from '@/lib/formatCurrency';
import {
  Loader2, AlertTriangle, CheckCircle, Clock, XCircle, Download,
  Pencil, CheckCircle2, MessageSquare, X, Send, Mic,
  Plus, Trash2, Check, XIcon, Image as ImageIcon, Sparkles, MicOff, Film,
  Eye,
} from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';

interface Finding { description: string; severity: string; confidence: number; component?: string; condition?: string; estimatedCost?: number; quantity?: number }
interface ClientInfo { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null; taxId?: string | null }
interface OrgInfo { name: string; logoUrl?: string | null; address?: string | null; phone?: string | null; taxId?: string | null; currency?: string; language?: string }
interface ChatMsg { id: string; reportId: string; role: string; content: string; createdAt: string }
interface Suggestion { field: string; value: unknown; reason: string }
interface Report {
  id: string; title: string; description: string | null; status: string; severity: string | null;
  audioTranscript: string | null; findings: Finding[] | null; executiveSummary: string | null;
  recommendedAction: string | null; aiModel: string | null; aiResponseTime: number | null;
  subtotal: number | null; taxRate: number | null; tax: number | null; total: number | null;
  currency: string | null; language: string | null; paymentTerms: string | null;
  clientId: string | null; createdAt: string; completedAt: string | null; imageUrls: string[];
  client: ClientInfo | null; organization: OrgInfo | null;
}

const statusLabels: Record<string, string> = { PENDING: 'Pendiente', PROCESSING: 'Procesando', TRANSCRIBING: 'Transcribiendo', ANALYZING: 'Analizando', COMPLETED: 'Completado', DRAFT: 'Borrador', APPROVED: 'Aprobado', FAILED: 'Fallido' };
const severityColors: Record<string, string> = { CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700', MEDIUM: 'bg-yellow-100 text-yellow-700', LOW: 'bg-blue-100 text-blue-700', INFO: 'bg-gray-100 text-gray-700' };
const severityLabels: Record<string, string> = { CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Medio', LOW: 'Bajo', INFO: 'Informativo' };
const severityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function EditableField({ value, onSave, type = 'text', placeholder = '', className = '' }: { value: string | number; onSave: (v: string) => Promise<void>; type?: string; placeholder?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const start = () => { setDraft(String(value)); setEditing(true); };
  const save = async () => { setSaving(true); try { await onSave(draft); } catch { toast.error('Error al guardar'); } finally { setSaving(false); setEditing(false); } };
  if (editing) return (
    <span className="inline-flex items-center gap-1">
      <input type={type} step={type === 'number' ? '0.01' : undefined} value={draft} onChange={e => setDraft(e.target.value)} className={`px-2 py-1 border border-blue-300 rounded text-sm ${className}`} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} disabled={saving} />
      <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><XIcon className="w-3.5 h-3.5" /></button>
    </span>
  );
  return <span className="cursor-pointer group" onClick={start}><span className={className}>{value != null && value !== '' ? value : <span className="text-gray-400 italic">{placeholder || 'Clic para editar'}</span>}</span><Pencil className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-60 transition text-gray-400" /></span>;
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const chatVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (id) fetchReport(); }, [id]);
  useEffect(() => {
    if (!report || !id) return;
    if (['COMPLETED', 'FAILED', 'DRAFT', 'APPROVED'].includes(report.status)) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/reports/${id}/events?token=${token}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status-change') {
          fetchReport();
        }
        if (data.type === 'done') {
          fetchReport();
          es.close();
        }
      } catch {
        // Ignore parse errors (heartbeats)
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [report?.status, id]);
  useEffect(() => { if (chatOpen) fetchChat(); }, [chatOpen]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const fetchReport = async () => {
    try {
      const res = await api.get(`/api/v1/reports/${id}`);
      const prevStatus = report?.status;
      const newReport = res.data;
      setReport(newReport);

      // Notify when report completes or fails
      if (prevStatus && ['PENDING','PROCESSING','TRANSCRIBING','ANALYZING'].includes(prevStatus)) {
        if (newReport.status === 'COMPLETED') {
          toast.success('Presupuesto generado exitosamente', {
            description: newReport.title,
            action: { label: 'Ver', onClick: () => window.location.reload() },
          });
        } else if (newReport.status === 'FAILED') {
          toast.error('Error al generar el presupuesto', {
            description: 'Intenta de nuevo o contacta soporte.',
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  };
  const fetchChat = async () => { try { const res = await api.get(`/api/v1/reports/${id}/chat`); setChatMessages(res.data.items); } catch {} };

  const sendChat = async (message?: string) => {
    const msg = (message || chatInput).trim();
    if (!msg || chatSending) return;
    setChatSending(true); setChatInput('');
    setChatMessages(p => [...p, { id: `t-${Date.now()}`, reportId: id, role: 'user', content: msg, createdAt: new Date().toISOString() }]);
    try {
      const res = await api.post(`/api/v1/reports/${id}/chat`, { message: msg });
      setChatMessages(p => [...p, res.data.message]);
      if (res.data.suggestions && res.data.suggestions.length > 0) setSuggestions(prev => [...prev, ...res.data.suggestions]);
      if (res.data.modifications || res.data.suggestions) fetchReport();
    } catch { toast.error('Error al enviar mensaje'); } finally { setChatSending(false); }
  };

  const sendAudio = async (audioBlob: Blob) => {
    setChatSending(true);
    setChatMessages(p => [...p, { id: `v-${Date.now()}`, reportId: id, role: 'user', content: '🎤 Enviando nota de voz...', createdAt: new Date().toISOString() }]);
    try {
      const fd = new FormData();
      const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: audioBlob.type || 'audio/webm' });
      fd.append('audio', file);
      const res = await uploadFiles<{ transcription?: string; message: any; suggestions?: any[]; modifications?: any }>(`/api/v1/reports/${id}/chat/audio`, fd);
      setChatMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.content.startsWith('🎤')) {
          updated[updated.length - 1] = { ...lastMsg, content: `🎤 ${res.data.transcription || 'Audio procesado'}` };
        }
        return updated;
      });
      setChatMessages(p => [...p, res.data.message]);
      if (res.data.suggestions) setSuggestions(prev => [...prev, ...(res.data.suggestions as any[])]);
      if (res.data.modifications || res.data.suggestions) fetchReport();
    } catch { toast.error('Error al procesar audio'); } finally { setChatSending(false); }
  };

  const uploadAudioToChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fileCopy = new File([f], f.name, { type: f.type });
    e.target.value = '';
    await sendAudio(fileCopy);
  };

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          sendAudio(blob);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch { toast.error('No se pudo acceder al micrófono'); }
    }
  }, [isRecording]);

  const applySuggestion = async (suggestion: Suggestion) => {
    try {
      await api.patch(`/api/v1/reports/${id}`, { [suggestion.field]: suggestion.value });
      setSuggestions(prev => prev.filter(s => s !== suggestion));
      toast.success('Sugerencia aplicada');
      fetchReport();
    } catch { toast.error('Error al aplicar sugerencia'); }
  };

  const dismissSuggestion = (suggestion: Suggestion) => { setSuggestions(prev => prev.filter(s => s !== suggestion)); };

  const patch = async (data: Record<string, unknown>) => { await api.patch(`/api/v1/reports/${id}`, data); fetchReport(); };

  const downloadPDF = async () => { try { const res = await api.get(`/api/v1/reports/${id}/pdf`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a'); link.href = url; link.download = `${report?.title || 'presupuesto'}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('Error al generar PDF'); } };
  const openPdfPreview = async () => { try { const res = await api.get(`/api/v1/reports/${id}/pdf?preview=true`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })); setPdfPreviewUrl(url); setShowPdfPreview(true); } catch { toast.error('Error al generar vista previa'); } };
  const changeStatus = async (s: string) => { try { await api.patch(`/api/v1/reports/${id}`, { status: s }); toast.success(`Estado: ${statusLabels[s] || s}`); fetchReport(); } catch { toast.error('Error al cambiar estado'); } };

  const updateFinding = async (idx: number, field: string, value: unknown) => { if (!report?.findings) return; const updated = [...report.findings]; updated[idx] = { ...updated[idx], [field]: value }; await patch({ findings: updated }); toast.success('Hallazgo actualizado'); };
  const addFinding = async () => { const f: Finding = { description: 'Nuevo item', severity: 'MEDIUM', confidence: 0.5, estimatedCost: 0, quantity: 1 }; const updated = [...(report?.findings || []), f]; await patch({ findings: updated }); toast.success('Item agregado'); };
  const removeFinding = async (idx: number) => { if (!report?.findings) return; const updated = report.findings.filter((_, i) => i !== idx); await patch({ findings: updated }); toast.success('Item eliminado'); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (files.length === 0) return;
    e.target.value = '';
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      await uploadFiles(`/api/v1/reports/${id}/upload`, fd);
      toast.success('Imágenes subidas');
      fetchReport();
    } catch (err: any) { console.error('[UPLOAD ERROR]', err?.response?.data || err); toast.error('Error al subir imágenes'); }
  };

  const handleChatFileUpload = async (files: File[], typeLabel: string) => {
    if (!report) return;
    setUploading(true);
    const names = files.map(f => f.name);
    setChatMessages(p => [...p, { id: `f-${Date.now()}`, reportId: id, role: 'user', content: `📎 Subiendo ${typeLabel}: ${names.join(', ')}`, createdAt: new Date().toISOString() }]);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      await uploadFiles(`/api/v1/reports/${id}/upload`, fd);
      setChatMessages(p => {
        const updated = [...p];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.content.startsWith('📎 Subiendo')) {
          updated[updated.length - 1] = { ...lastMsg, content: `📎 ${typeLabel} subido correctamente` };
        }
        return updated;
      });
      toast.success('Archivos subidos');
      fetchReport();
      await api.post(`/api/v1/reports/${id}/generate`);
      toast.success('Re-análisis iniciado');
    } catch (err: any) { console.error('[UPLOAD ERROR]', err?.response?.data || err); toast.error('Error al subir archivos'); }
    finally { setUploading(false); }
  };

  const recalcTotals = (findings: Finding[], taxRate: number | null) => {
    const subtotal = findings.reduce((s, f) => s + (f.estimatedCost || 0) * (f.quantity || 1), 0);
    const rate = taxRate ?? 19;
    const tax = subtotal * (rate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const getStatusIcon = (s: string) => { switch (s) { case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-600" />; case 'APPROVED': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />; case 'DRAFT': return <Pencil className="w-5 h-5 text-amber-600" />; case 'FAILED': return <XCircle className="w-5 h-5 text-red-600" />; case 'PENDING': return <Clock className="w-5 h-5 text-gray-500" />; default: return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />; } };

  if (isLoading) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>;
  if (error || !report) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /><p className="text-gray-700">{error || 'No encontrado'}</p></div></main>;

  const isProcessing = !['COMPLETED', 'FAILED', 'DRAFT', 'APPROVED'].includes(report.status);
  const isEditable = report.status === 'DRAFT';
  const canEdit = report.status === 'COMPLETED' || report.status === 'DRAFT';
  const cur = report.currency || report.organization?.currency || 'USD';
  const findings = report.findings || [];
  const subtotal = report.subtotal ?? findings.reduce((s, f) => s + (f.estimatedCost || 0) * (f.quantity || 1), 0);
  const taxRate = report.taxRate ?? 19;
  const calcTax = subtotal * (taxRate / 100);
  const total = report.total ?? (subtotal + calcTax);
  const org = report.organization;

  return (
    <main className="min-h-screen bg-gray-100 print:bg-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8 print:py-0 print:px-0">

        {/* === ACTIONS BAR === */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-2">
            {getStatusIcon(report.status)}
            <span className="font-medium text-gray-900">{statusLabels[report.status] || report.status}</span>
            {isProcessing && <span className="text-sm text-gray-500 animate-pulse">Procesando...</span>}
          </div>
          <div className="flex items-center gap-2">
            {(report.status === 'COMPLETED' || isEditable || report.status === 'APPROVED') && (
              <>
                <button onClick={openPdfPreview} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"><Eye className="w-4 h-4" />Vista previa</button>
                <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"><Download className="w-4 h-4" />Descargar PDF</button>
              </>
            )}
            {canEdit && (
              <button onClick={() => setChatOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"><MessageSquare className="w-4 h-4" />IA</button>
            )}
            {report.status === 'COMPLETED' && canEdit && (
              <button onClick={() => changeStatus('DRAFT')} className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-md text-sm font-medium hover:bg-amber-50"><Pencil className="w-4 h-4" />Editar</button>
            )}
            {isEditable && (
              <button onClick={() => changeStatus('APPROVED')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4" />Aprobar</button>
            )}
          </div>
        </div>

        {/* === SUGGESTIONS === */}
        {suggestions.length > 0 && (
          <div className="mb-4 space-y-2 print:hidden">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-900">{s.reason || `Sugerencia: ${s.field}`}</p>
                </div>
                <button onClick={() => applySuggestion(s)} className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700">Aplicar</button>
                <button onClick={() => dismissSuggestion(s)} className="text-amber-400 hover:text-amber-600"><XIcon className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}

        {/* === PRESUPUESTO DOCUMENT === */}
        <div className="bg-white rounded-lg shadow-lg print:shadow-none print:rounded-none overflow-hidden">

          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {org?.logoUrl ? (
                  <img src={org.logoUrl} alt={org.name} className="w-14 h-14 rounded-md object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold">
                    {(org?.name || 'O').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{org?.name || 'Organización'}</h1>
                  {org?.taxId && <p className="text-sm text-gray-500">{org.taxId}</p>}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600 space-y-0.5">
                {org?.address && <p>{org.address}</p>}
                {org?.phone && <p>{org.phone}</p>}
              </div>
            </div>
          </div>

          {/* Banner PRESUPUESTO */}
          <div className="bg-gray-100 px-8 py-3 text-center">
            <span className="text-lg font-bold tracking-widest text-gray-800 uppercase">Presupuesto</span>
          </div>

          {/* Identification */}
          <div className="px-8 py-5 border-b border-gray-100">
            <div className="flex justify-between">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Presupuesto N°</p>
                {canEdit ? (
                  <EditableField value={report.title || ''} onSave={(v) => patch({ title: v })} className="font-semibold text-gray-900" />
                ) : <p className="font-semibold text-gray-900">{report.title}</p>}
                <p className="text-sm text-gray-500">{new Date(report.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
              {report.client && (
                <div className="text-right space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Cliente</p>
                  <p className="font-semibold text-gray-900">{report.client.name}</p>
                  {report.client.taxId && <p className="text-sm text-gray-500">{report.client.taxId}</p>}
                  {report.client.email && <p className="text-sm text-gray-500">{report.client.email}</p>}
                  {report.client.phone && <p className="text-sm text-gray-500">{report.client.phone}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Executive Summary */}
          {(report.executiveSummary || canEdit) && (
            <div className="px-8 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-1">Resumen</h3>
              {canEdit ? (
                <EditableField value={report.executiveSummary || ''} onSave={(v) => patch({ executiveSummary: v })} placeholder="Sin resumen" className="text-sm text-gray-700" />
              ) : <p className="text-sm text-gray-700">{report.executiveSummary || 'Sin resumen'}</p>}
            </div>
          )}

          {/* === ITEMS TABLE === */}
          <div className="px-8 py-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Items</h3>
              {canEdit && (
                <button onClick={addFinding} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"><Plus className="w-3.5 h-3.5" />Agregar</button>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 pr-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Cant.</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Precio Unit.</th>
                  <th className="text-right py-2 pl-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Total</th>
                  {canEdit && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => {
                  const qty = f.quantity ?? 1;
                  const lineTotal = (f.estimatedCost || 0) * qty;
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 group">
                      <td className="py-2 pr-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 px-2">
                        <div>
                          {canEdit ? (
                            <EditableField value={f.description} onSave={(v) => updateFinding(i, 'description', v)} className="text-gray-900" />
                          ) : <span className="text-gray-900">{f.description}</span>}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${severityColors[f.severity] || 'bg-gray-100 text-gray-700'}`}>
                              {severityLabels[f.severity] || f.severity}
                            </span>
                            {f.component && <span className="text-[10px] text-gray-400">{f.component}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-gray-700">
                        {canEdit ? (
                          <EditableField value={qty} onSave={async (v) => { await updateFinding(i, 'quantity', parseInt(v) || 1); const newFindings = [...findings]; newFindings[i] = { ...newFindings[i], quantity: parseInt(v) || 1 }; patch({ ...recalcTotals(newFindings, report.taxRate), findings: newFindings }); }} type="number" className="w-12 text-right" />
                        ) : <span>{qty}</span>}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-700">
                        {canEdit ? (
                          <span className="inline-flex items-center gap-0.5">
                            <span className="text-gray-400 text-xs">{getCurrencySymbol(cur)}</span>
                            <EditableField value={f.estimatedCost ?? 0} onSave={async (v) => { const val = parseFloat(v) || 0; await updateFinding(i, 'estimatedCost', val); const newFindings = [...findings]; newFindings[i] = { ...newFindings[i], estimatedCost: val }; patch({ ...recalcTotals(newFindings, report.taxRate), findings: newFindings }); }} type="number" className="w-20 text-right" />
                          </span>
                        ) : <span>{formatCurrency(f.estimatedCost, cur)}</span>}
                      </td>
                      <td className="py-2 pl-2 text-right font-medium text-gray-900">
                        {formatCurrency(lineTotal, cur)}
                      </td>
                      {canEdit && <td className="py-2 pl-1"><button onClick={() => removeFinding(i)} className="text-gray-300 hover:text-red-500 transition"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                    </tr>
                  );
                })}
                {findings.length === 0 && (
                  <tr><td colSpan={canEdit ? 6 : 5} className="py-8 text-center text-gray-400">No hay items. {canEdit && 'Hacé clic en "Agregar" para añadir.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* === COST SUMMARY === */}
          <div className="px-8 py-5 border-t border-gray-200 bg-gray-50/50">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  {canEdit ? (
                    <EditableField value={formatNumberInput(subtotal, cur)} onSave={async (v) => { const val = parseFloat(v) || 0; await patch({ subtotal: val }); }} type="number" className="w-28 text-right font-medium" />
                  ) : <span className="font-medium">{formatCurrency(subtotal, cur)}</span>}
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">
                    IVA{canEdit ? (
                      <span className="ml-1">(<EditableField value={taxRate} onSave={(v) => patch({ taxRate: parseFloat(v) || 0 })} type="number" className="w-8 text-center" />%)</span>
                    ) : ` (${taxRate}%)`}:
                  </span>
                  {canEdit ? (
                    <EditableField value={formatNumberInput(calcTax, cur)} onSave={async (v) => { const val = parseFloat(v) || 0; await patch({ tax: val }); }} type="number" className="w-28 text-right font-medium" />
                  ) : <span className="font-medium">{formatCurrency(calcTax, cur)}</span>}
                </div>
                {canEdit && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Moneda:</span>
                    <select value={cur} onChange={(e) => patch({ currency: e.target.value })} className="px-2 py-0.5 border border-gray-300 rounded text-sm bg-white">
                      <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                      <option value="MXN">MXN (MX$)</option><option value="COP">COP (COP$)</option><option value="ARS">ARS (AR$)</option>
                      <option value="BRL">BRL (R$)</option><option value="PEN">PEN (S/)</option><option value="CLP">CLP (CLP$)</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                  <span>Total:</span>
                  {canEdit ? (
                    <EditableField value={formatNumberInput(total, cur)} onSave={async (v) => { const val = parseFloat(v) || 0; await patch({ total: val }); }} type="number" className="w-28 text-right font-bold" />
                  ) : <span>{formatCurrency(total, cur)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          {(report.paymentTerms || canEdit) && (
            <div className="px-8 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Condiciones de pago</p>
              {canEdit ? (
                <EditableField value={report.paymentTerms || ''} onSave={(v) => patch({ paymentTerms: v })} placeholder="Ej: 50% al inicio, 50% al finalizar" className="text-sm text-gray-600" />
              ) : <p className="text-sm text-gray-600">{report.paymentTerms || 'Sin condiciones de pago'}</p>}
            </div>
          )}

          {/* Recommended Action */}
          {(report.recommendedAction || canEdit) && (
            <div className="px-8 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Acción Recomendada</p>
              {canEdit ? (
                <EditableField value={report.recommendedAction || ''} onSave={(v) => patch({ recommendedAction: v })} placeholder="Sin recomendación" className="text-sm text-gray-600" />
              ) : <p className="text-sm text-gray-600">{report.recommendedAction || 'Sin recomendación'}</p>}
            </div>
          )}

          {/* Images */}
          {report.imageUrls.length > 0 && (
            <div className="px-8 py-4 border-t border-gray-100 print:hidden">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Imágenes adjuntas</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {report.imageUrls.map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-gray-100 rounded-md overflow-hidden hover:opacity-90"><img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" /></a>))}
              </div>
            </div>
          )}

          {/* Upload more media */}
          {canEdit && (
            <div className="px-8 py-4 border-t border-gray-100 print:hidden">
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 text-xs font-medium">
                  <ImageIcon className="w-3.5 h-3.5" />Agregar fotos
                  <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-3 border-t border-gray-200 text-center text-xs text-gray-400 print:hidden">
            Analizado con {report.aiModel || 'IA'} {report.aiResponseTime ? `· ${report.aiResponseTime}ms` : ''} · ID: {report.id.slice(0, 8)}
          </div>
        </div>
      </div>

      {/* === CHAT PANEL === */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex print:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setChatOpen(false)} />
          <div className="ml-auto w-full max-w-md bg-white shadow-xl flex flex-col h-full relative z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Consultar IA</h3>
                <p className="text-xs text-gray-500">Modifica el presupuesto por texto o voz</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600 mb-2">¿Qué querés modificar?</p>
                  <div className="text-xs space-y-1 text-gray-400">
                    <p>&quot;Cambia el precio del item 1 a $150.000&quot;</p>
                    <p>&quot;Agrega un item sobre corrosión en la carrocería&quot;</p>
                    <p>&quot;Reescribe el resumen en términos más simples&quot;</p>
                  </div>
                  <div className="mt-4">
                    <button onClick={() => sendChat('Sugiere mejoras para este presupuesto')} disabled={chatSending} className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50">
                      <Sparkles className="w-4 h-4 inline mr-1" />Sugerir mejoras
                    </button>
                  </div>
                </div>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
                </div>
              ))}
              {chatSending && <div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-500" /></div></div>}
              {uploading && <div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-500 mr-2" /><span className="text-sm text-gray-600">Subiendo archivos...</span></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2">
                <button onClick={toggleRecording} disabled={chatSending || uploading} className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${isRecording ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'}`}>
                  {isRecording ? <><MicOff className="w-4 h-4" />Detener</> : <><Mic className="w-4 h-4" />Grabar</>}
                </button>
                <label className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50">
                  <ImageIcon className="w-4 h-4" />Foto
                  <input ref={chatImageInputRef} type="file" accept="image/*" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) { handleChatFileUpload(files, `${files.length} imagen${files.length > 1 ? 'es' : ''}`); } e.target.value = ''; }} className="hidden" disabled={chatSending || uploading} />
                </label>
                <label className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50">
                  <Film className="w-4 h-4" />Video
                  <input ref={chatVideoInputRef} type="file" accept="video/*" multiple onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) { handleChatFileUpload(files, `${files.length} video${files.length > 1 ? 's' : ''}`); } e.target.value = ''; }} className="hidden" disabled={chatSending || uploading} />
                </label>
                <label className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50">
                  <Mic className="w-4 h-4" />Audio
                  <input ref={audioInputRef} type="file" accept="audio/*" onChange={uploadAudioToChat} className="hidden" disabled={chatSending || uploading} />
                </label>
              </div>
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }}} placeholder="Escribe una instrucción..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" disabled={chatSending || uploading} />
                <button onClick={() => sendChat()} disabled={chatSending || uploading || !chatInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"><Send className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => sendChat('Sugiere mejoras para este presupuesto')} disabled={chatSending || uploading} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-medium hover:bg-amber-100 disabled:opacity-50">
                  <Sparkles className="w-3 h-3 inline mr-1" />Sugerir mejoras
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === PDF PREVIEW MODAL === */}
      {showPdfPreview && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowPdfPreview(false); if (pdfPreviewUrl) { window.URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); } }} />
          <div className="relative z-10 w-full max-w-5xl h-[90vh] mx-4 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Vista previa del presupuesto</h3>
              <div className="flex items-center gap-2">
                <button onClick={downloadPDF} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700">
                  <Download className="w-3.5 h-3.5" />Descargar
                </button>
                <button
                  onClick={() => { setShowPdfPreview(false); if (pdfPreviewUrl) { window.URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); } }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe src={pdfPreviewUrl} className="w-full h-full" title="Vista previa PDF" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}