'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Loader2, AlertTriangle, CheckCircle, Clock, XCircle, Download,
  Pencil, CheckCircle2, MessageSquare, X, Send, Mic,
  Plus, Trash2, Check, XIcon,
} from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';

interface Finding { description: string; severity: string; confidence: number; component?: string; condition?: string; estimatedCost?: number }
interface ClientInfo { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null; taxId?: string | null }
interface ChatMsg { id: string; reportId: string; role: string; content: string; createdAt: string }
interface Report {
  id: string; title: string; description: string | null; status: string; severity: string | null;
  audioTranscript: string | null; findings: Finding[] | null; executiveSummary: string | null;
  recommendedAction: string | null; aiModel: string | null; aiResponseTime: number | null;
  subtotal: number | null; tax: number | null; total: number | null; currency: string | null; language: string | null;
  clientId: string | null; createdAt: string; completedAt: string | null; imageUrls: string[]; client: ClientInfo | null;
}

const cs = (c: string | null) => ({ USD: '$', EUR: '\u20ac', GBP: '\u00a3', MXN: 'MX$', COP: 'COP$', ARS: 'AR$', BRL: 'R$', PEN: 'S/', CLP: 'CLP$' }[c || 'USD'] || (c || 'USD') + ' ');
const statusLabels: Record<string, string> = { PENDING: 'Pendiente', PROCESSING: 'Procesando', TRANSCRIBING: 'Transcribiendo', ANALYZING: 'Analizando', COMPLETED: 'Completado', DRAFT: 'Borrador', APPROVED: 'Aprobado', FAILED: 'Fallido' };
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (id) fetchReport(); }, [id]);
  useEffect(() => {
    if (!report) return;
    if (['COMPLETED', 'FAILED', 'DRAFT', 'APPROVED'].includes(report.status)) return;
    const interval = setInterval(() => fetchReport(), 3000);
    return () => clearInterval(interval);
  }, [report?.status, id]);
  useEffect(() => { if (chatOpen) fetchChat(); }, [chatOpen]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const fetchReport = async () => { try { const res = await api.get(`/api/v1/reports/${id}`); setReport(res.data); } catch (err: any) { setError(err.response?.data?.error || 'Error al cargar'); } finally { setIsLoading(false); } };
  const fetchChat = async () => { try { const res = await api.get(`/api/v1/reports/${id}/chat`); setChatMessages(res.data.items); } catch {} };

  const sendChat = async () => {
    if (!chatInput.trim() || chatSending) return;
    setChatSending(true); const msg = chatInput.trim(); setChatInput('');
    setChatMessages(p => [...p, { id: `t-${Date.now()}`, reportId: id, role: 'user', content: msg, createdAt: new Date().toISOString() }]);
    try { const res = await api.post(`/api/v1/reports/${id}/chat`, { message: msg }); setChatMessages(p => [...p, res.data.message]); if (res.data.modifications) fetchReport(); }
    catch { toast.error('Error al enviar mensaje'); } finally { setChatSending(false); }
  };

  const patch = async (data: Record<string, unknown>) => { await api.patch(`/api/v1/reports/${id}`, data); fetchReport(); };

  const downloadPDF = async () => { try { const res = await api.get(`/api/v1/reports/${id}/pdf`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a'); link.href = url; link.download = `${report?.title || 'presupuesto'}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('Error al generar PDF'); } };
  const changeStatus = async (s: string) => { try { await api.patch(`/api/v1/reports/${id}`, { status: s }); toast.success(`Estado: ${statusLabels[s] || s}`); fetchReport(); } catch { toast.error('Error al cambiar estado'); } };

  const updateFinding = async (idx: number, field: string, value: unknown) => { if (!report?.findings) return; const updated = [...report.findings]; updated[idx] = { ...updated[idx], [field]: value }; await patch({ findings: updated }); toast.success('Hallazgo actualizado'); };
  const addFinding = async () => { const f: Finding = { description: 'Nuevo hallazgo', severity: 'MEDIUM', confidence: 0.5, estimatedCost: 0 }; const updated = [...(report?.findings || []), f]; await patch({ findings: updated }); toast.success('Hallazgo agregado'); };
  const removeFinding = async (idx: number) => { if (!report?.findings) return; const updated = report.findings.filter((_, i) => i !== idx); await patch({ findings: updated }); toast.success('Hallazgo eliminado'); };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    if (!f.type.startsWith('audio/')) { toast.error('Solo archivos de audio'); return; }
    setChatMessages(p => [...p, { id: `v-${Date.now()}`, reportId: id, role: 'user', content: `🎤 Nota de voz: ${f.name}`, createdAt: new Date().toISOString() }]);
    setChatSending(true);
    try {
      const fd = new FormData(); fd.append('files', f);
      await api.post(`/api/v1/reports/${id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.post(`/api/v1/reports/${id}/generate`);
      toast.success('Audio recibido. Re-analizando presupuesto...');
      fetchReport();
    } catch { toast.error('Error al subir audio'); }
    finally { setChatSending(false); }
  };

  const getStatusIcon = (s: string) => { switch (s) { case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-600" />; case 'APPROVED': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />; case 'DRAFT': return <Pencil className="w-5 h-5 text-amber-600" />; case 'FAILED': return <XCircle className="w-5 h-5 text-red-600" />; case 'PENDING': return <Clock className="w-5 h-5 text-gray-500" />; default: return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />; } };
  const getSeverityColor = (s: string) => ({ CRITICAL: 'bg-red-100 text-red-700 border-red-200', HIGH: 'bg-orange-100 text-orange-700 border-orange-200', MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200', LOW: 'bg-blue-100 text-blue-700 border-blue-200', INFO: 'bg-gray-100 text-gray-700 border-gray-200' }[s] || 'bg-gray-100 text-gray-700 border-gray-200');

  if (isLoading) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>;
  if (error || !report) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /><p className="text-gray-700">{error || 'No encontrado'}</p></div></main>;

  const isProcessing = !['COMPLETED', 'FAILED', 'DRAFT', 'APPROVED'].includes(report.status);
  const isEditable = report.status === 'DRAFT';
  const canEdit = report.status === 'COMPLETED' || report.status === 'DRAFT';

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* === HEADER === */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">{getStatusIcon(report.status)}<span className="font-medium text-gray-900">{statusLabels[report.status] || report.status}</span></div>
            <div className="text-sm text-gray-500">{new Date(report.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900"><EditableField value={report.title || ''} onSave={(v) => patch({ title: v })} className="font-bold text-xl" /></h1>
            </div>
          ) : <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>}
          {report.description && canEdit ? (
            <p className="text-gray-600 mt-2"><EditableField value={report.description || ''} onSave={(v) => patch({ description: v })} placeholder="Sin descripción" /></p>
          ) : report.description ? <p className="text-gray-600 mt-2">{report.description}</p> : null}
          {isProcessing && <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-center gap-3 mt-4"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /><div><p className="font-medium text-blue-900">Procesando tu presupuesto...</p><p className="text-sm text-blue-700">Esto puede tardar unos minutos.</p></div></div>}
          {(report.status === 'COMPLETED' && canEdit) && <button onClick={() => changeStatus('DRAFT')} className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-700 rounded-md text-sm font-medium hover:bg-amber-50 mt-4"><Pencil className="w-4 h-4" />Editar como Borrador</button>}
          {isEditable && <div className="flex gap-2 mt-4">
            <button onClick={() => changeStatus('APPROVED')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4" />Aprobar Presupuesto</button>
            <button onClick={() => changeStatus('COMPLETED')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">Volver a Completado</button>
          </div>}
        </div>

        {/* === CLIENT === */}
        {report.client && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{report.client.name}</span></div>
              {report.client.email && <div><span className="text-gray-500">Email:</span> {report.client.email}</div>}
              {report.client.phone && <div><span className="text-gray-500">Teléfono:</span> {report.client.phone}</div>}
              {report.client.taxId && <div><span className="text-gray-500">RUC/RUT:</span> {report.client.taxId}</div>}
            </div>
          </div>
        )}

        {/* === IMAGES === */}
        {report.imageUrls.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Imágenes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {report.imageUrls.map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-gray-100 rounded-md overflow-hidden hover:opacity-90"><img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" /></a>))}
            </div>
          </div>
        )}

        {/* === VOICE NOTE (editable) === */}
        {canEdit && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Agregar Nota de Voz</h3>
            <p className="text-sm text-gray-500 mb-3">Sube un audio con tus observaciones. Se transcribirá y el presupuesto se actualizará.</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-md cursor-pointer hover:bg-purple-100 text-sm font-medium">
              <Mic className="w-4 h-4" /> Seleccionar audio
              <input ref={voiceInputRef} type="file" accept="audio/*" onChange={handleVoiceUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* === EXECUTIVE SUMMARY === */}
        {(report.executiveSummary || canEdit) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Resumen Ejecutivo</h3>
            {canEdit ? (
              <EditableField value={report.executiveSummary || ''} onSave={(v) => patch({ executiveSummary: v })} type="text" placeholder="Sin resumen" />
            ) : <p className="text-gray-700 leading-relaxed">{report.executiveSummary || 'Sin resumen'}</p>}
          </div>
        )}

        {/* === FINDINGS === */}
        {report.findings && report.findings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Hallazgos</h3>
              {canEdit && <button onClick={addFinding} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"><Plus className="w-3.5 h-3.5" />Agregar</button>}
            </div>
            <div className="space-y-4">
              {report.findings.map((f, i) => (
                <div key={i} className={`border rounded-lg p-4 ${getSeverityColor(f.severity)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Hallazgo {i + 1}</span>
                        <div className="mt-1">
                          {canEdit ? (
                            <EditableField value={f.description} onSave={(v) => updateFinding(i, 'description', v)} className="text-sm font-medium" />
                          ) : <p className="text-sm font-medium">{f.description}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="opacity-70">Severidad:</span>
                          {canEdit ? (
                            <select value={f.severity} onChange={(e) => updateFinding(i, 'severity', e.target.value)} className="px-2 py-0.5 border border-gray-300 rounded text-sm bg-white">
                              {severityOptions.map(s => <option key={s} value={s}>{severityLabels[s] || s}</option>)}
                            </select>
                          ) : <span className="font-medium">{severityLabels[f.severity] || f.severity}</span>}
                        </div>
                        {f.component && <div><span className="opacity-70">Componente:</span> <span className="font-medium">{f.component}</span></div>}
                        <div><span className="opacity-70">Confianza:</span> <span className="font-medium">{Math.round(f.confidence * 100)}%</span></div>
                        <div className="font-semibold">
                          {canEdit ? (
                            <span className="flex items-center gap-1">
                              <span className="opacity-70">Costo:</span>
                              <span className="opacity-50">{cs(report.currency)}</span>
                              <EditableField value={f.estimatedCost ?? 0} onSave={(v) => updateFinding(i, 'estimatedCost', parseFloat(v) || 0)} type="number" className="w-20 text-right font-bold" />
                            </span>
                          ) : (
                            f.estimatedCost != null ? <span>Costo: {cs(report.currency)}{f.estimatedCost.toFixed(2)}</span> : null
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && <button onClick={() => removeFinding(i)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === COST SUMMARY === */}
        {(report.subtotal != null || report.total != null || canEdit) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Resumen de Costos</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Subtotal:</span>
                {canEdit ? <EditableField value={report.subtotal ?? 0} onSave={(v) => patch({ subtotal: parseFloat(v) || 0 })} type="number" className="w-28 text-right font-medium" />
                : <span className="font-medium">{cs(report.currency)}{(report.subtotal ?? 0).toFixed(2)}</span>}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Impuestos:</span>
                {canEdit ? <EditableField value={report.tax ?? 0} onSave={(v) => patch({ tax: parseFloat(v) || 0 })} type="number" className="w-28 text-right font-medium" />
                : <span className="font-medium">{cs(report.currency)}{(report.tax ?? 0).toFixed(2)}</span>}
              </div>
              <div className="flex justify-between items-center font-semibold text-lg border-t pt-2 mt-2">
                <span>Total:</span>
                {canEdit ? <EditableField value={report.total ?? 0} onSave={(v) => patch({ total: parseFloat(v) || 0 })} type="number" className="w-28 text-right font-bold text-lg" />
                : <span>{cs(report.currency)}{(report.total ?? 0).toFixed(2)}</span>}
              </div>
            </div>
          </div>
        )}

        {/* === RECOMMENDED ACTION === */}
        {(report.recommendedAction || canEdit) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Acción Recomendada</h3>
            {canEdit ? <EditableField value={report.recommendedAction || ''} onSave={(v) => patch({ recommendedAction: v })} placeholder="Sin recomendación" />
            : <p className="text-gray-700 leading-relaxed">{report.recommendedAction || 'Sin recomendación'}</p>}
          </div>
        )}

        {/* === FOOTER ACTIONS === */}
        {(report.status === 'COMPLETED' || isEditable || report.status === 'APPROVED') && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Analizado con {report.aiModel || 'IA'} en {report.aiResponseTime ? `${report.aiResponseTime}ms` : 'N/A'}</div>
              <div className="flex items-center gap-3">
                {canEdit && <button onClick={() => setChatOpen(true)} className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"><MessageSquare className="w-4 h-4" />Consultar IA</button>}
                <button onClick={downloadPDF} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"><Download className="w-4 h-4" />Descargar PDF</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === CHAT PANEL === */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setChatOpen(false)} />
          <div className="ml-auto w-full max-w-md bg-white shadow-xl flex flex-col h-full relative z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">Consultar IA</h3>
                <p className="text-xs text-gray-500">Modifica el presupuesto por texto o voz</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600 mb-2">¿Qué querés modificar?</p>
                  <div className="text-xs space-y-1 text-gray-400">
                    <p>&quot;Cambia el precio del hallazgo 1 a $150.000&quot;</p>
                    <p>&quot;Reescribe el resumen en términos más simples&quot;</p>
                    <p>&quot;Agrega un hallazgo sobre corrosión en la carrocería&quot;</p>
                    <p>&quot;Aumenta la severidad del hallazgo 3 a ALTO&quot;</p>
                  </div>
                </div>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
                </div>
              ))}
              {chatSending && <div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-500" /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-4 space-y-2">
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }}} placeholder="Escribe una instrucción..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" disabled={chatSending} />
                <label className="flex items-center justify-center px-3 py-2 text-purple-600 hover:text-purple-700 cursor-pointer border border-gray-300 rounded-md" title="Subir nota de voz">
                  <Mic className="w-4 h-4" />
                  <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="hidden" disabled={chatSending} />
                </label>
                <button onClick={sendChat} disabled={chatSending || !chatInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"><Send className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-gray-400 text-center">Podés pedir cambios específicos como &quot;cambia el precio a $50.000&quot; o &quot;reescribe el resumen&quot;</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}