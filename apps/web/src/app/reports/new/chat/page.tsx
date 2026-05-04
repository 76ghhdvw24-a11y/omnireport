'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadFiles } from '@/lib/api';
import { Loader2, Mic, MicOff, Send, Sparkles, ArrowLeft, Image as ImageIcon, Film } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';

interface ChatMsg { id: string; role: string; content: string; createdAt: string }
interface Suggestion { field: string; value: unknown; reason: string }

export default function NewChatReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const createAndStart = async () => {
    if (!title.trim()) { toast.error('Ingresá un título'); return; }
    setCreating(true);
    try {
      const res = await api.post('/api/v1/reports', { title: title.trim(), description: 'Presupuesto creado desde chat con IA' });
      const newId = res.data.id;
      setReportId(newId);
      setChatMessages([{ id: 'sys-1', role: 'assistant', content: '¡Presupuesto creado! Podés:\n\n• **Subir fotos o videos** del problema\n• **Grabar una nota de voz**\n• **Escribir** lo que necesitás\n\nYo me encargo de generar los items con precios.', createdAt: new Date().toISOString() }]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear presupuesto');
    } finally { setCreating(false); }
  };

  const sendChat = async (message?: string) => {
    if (!reportId) return;
    const msg = (message || chatInput).trim();
    if (!msg || chatSending) return;
    setChatSending(true); setChatInput('');
    setChatMessages(p => [...p, { id: `t-${Date.now()}`, role: 'user', content: msg, createdAt: new Date().toISOString() }]);
    try {
      const res = await api.post(`/api/v1/reports/${reportId}/chat`, { message: msg });
      setChatMessages(p => [...p, res.data.message]);
      if (res.data.suggestions) setSuggestions(prev => [...prev, ...res.data.suggestions]);
    } catch { toast.error('Error al enviar mensaje'); }
    finally { setChatSending(false); }
  };

  const handleUpload = async (files: File[]) => {
    if (!reportId) return;
    setUploading(true);
    const imageNames = files.filter(f => f.type.startsWith('image/')).map(f => f.name);
    const videoNames = files.filter(f => f.type.startsWith('video/')).map(f => f.name);
    const otherNames = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/')).map(f => f.name);
    const allNames = [...imageNames, ...videoNames, ...otherNames];
    const desc: string[] = [];
    if (imageNames.length > 0) desc.push(`${imageNames.length} imagen${imageNames.length > 1 ? 'es' : ''}`);
    if (videoNames.length > 0) desc.push(`${videoNames.length} video${videoNames.length > 1 ? 's' : ''}`);
    if (otherNames.length > 0) desc.push(`${otherNames.length} archivo${otherNames.length > 1 ? 's' : ''}`);

    setChatMessages(p => [...p, { id: `f-${Date.now()}`, role: 'user', content: `📎 Subiendo ${desc.join(' y ')}: ${allNames.join(', ')}`, createdAt: new Date().toISOString() }]);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      await uploadFiles(`/api/v1/reports/${reportId}/upload`, fd);
      setChatMessages(p => {
        const updated = [...p];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.content.startsWith('📎 Subiendo')) {
          updated[updated.length - 1] = { ...lastMsg, content: `📎 ${desc.join(' y ')} subido${desc.length > 1 ? 's' : ''} correctamente` };
        }
        return updated;
      });
      toast.success('Archivos subidos');
    } catch { toast.error('Error al subir archivos'); }
    finally { setUploading(false); }
  };

  const uploadAndAnalyze = async (files: File[]) => {
    if (!reportId) return;
    setUploading(true);
    const imageNames = files.filter(f => f.type.startsWith('image/')).map(f => f.name);
    const videoNames = files.filter(f => f.type.startsWith('video/')).map(f => f.name);
    const desc: string[] = [];
    if (imageNames.length > 0) desc.push(`${imageNames.length} imagen${imageNames.length > 1 ? 'es' : ''}`);
    if (videoNames.length > 0) desc.push(`${videoNames.length} video${videoNames.length > 1 ? 's' : ''}`);

    setChatMessages(p => [...p, { id: `f-${Date.now()}`, role: 'user', content: `📎 Subiendo ${desc.join(' y ')}...`, createdAt: new Date().toISOString() }]);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      await uploadFiles(`/api/v1/reports/${reportId}/upload`, fd);
      setChatMessages(p => {
        const updated = [...p];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.content.startsWith('📎 Subiendo')) {
          updated[updated.length - 1] = { ...lastMsg, content: `📎 ${desc.join(' y ')} subido${desc.length > 1 ? 's' : ''}. Analizando...` };
        }
        return updated;
      });
      await api.post(`/api/v1/reports/${reportId}/generate`);
      toast.success('Archivos subidos. Generando presupuesto...');
    } catch (err: any) {
      console.error('[UPLOAD ERROR]', err?.response?.data || err);
      toast.error(err?.response?.data?.error || 'Error al procesar archivos');
    } finally { setUploading(false); }
  };

  const sendAudio = async (audioBlob: Blob) => {
    if (!reportId) { toast.error('Primero creá el presupuesto'); return; }
    setChatSending(true);
    setChatMessages(p => [...p, { id: `v-${Date.now()}`, role: 'user', content: '🎤 Procesando audio...', createdAt: new Date().toISOString() }]);
    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, `audio-${Date.now()}.webm`);
      const res = await uploadFiles<{ transcription?: string; message: any; suggestions?: any[] }>(`/api/v1/reports/${reportId}/chat/audio`, fd);
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
    } catch { toast.error('Error al procesar audio'); }
    finally { setChatSending(false); }
  };

  const toggleRecording = useCallback(async () => {
    if (!reportId) { toast.error('Primero creá el presupuesto'); return; }
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunks, { type: 'audio/webm' }); sendAudio(blob); };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch { toast.error('No se pudo acceder al micrófono'); }
    }
  }, [isRecording, reportId]);

  const applySuggestion = async (suggestion: Suggestion) => {
    if (!reportId) return;
    try {
      await api.patch(`/api/v1/reports/${reportId}`, { [suggestion.field]: suggestion.value });
      setSuggestions(prev => prev.filter(s => s !== suggestion));
      toast.success('Sugerencia aplicada');
    } catch { toast.error('Error al aplicar sugerencia'); }
  };

  const handleFileAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fileCopy = new File([f], f.name, { type: f.type });
    e.target.value = '';
    await sendAudio(fileCopy);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (files.length === 0) return;
    e.target.value = '';
    await uploadAndAnalyze(files);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    await uploadAndAnalyze(files);
  };

  if (!reportId) {
    return (
      <main className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg font-semibold text-gray-900">Crear desde Chat</h1>
          </div>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="text-center py-6">
              <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Presupuesto con IA</h2>
              <p className="text-sm text-gray-500">Subí fotos, videos o grabá una nota de voz. La IA genera el presupuesto por vos.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del presupuesto *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Ej: Inspección plomería cocina" />
            </div>
            <button onClick={createAndStart} disabled={creating || !title.trim()} className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Creando...</> : 'Comenzar'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg font-semibold text-gray-900">Presupuesto con IA</h1>
          </div>
          <button onClick={() => router.push(`/reports/${reportId}`)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">Ver presupuesto</button>
        </div>

        {suggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-900 flex-1">{s.reason || `Sugerencia: ${s.field}`}</p>
                <button onClick={() => applySuggestion(s)} className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700">Aplicar</button>
                <button onClick={() => setSuggestions(prev => prev.filter((_, idx) => idx !== i))} className="text-amber-400 hover:text-amber-600"><span className="text-lg">&times;</span></button>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.content}</div>
              </div>
            ))}
            {chatSending && <div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-500" /></div></div>}
            {uploading && <div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-gray-500 mr-2" /><span className="text-sm text-gray-600">Subiendo archivos...</span></div></div>}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t p-3 space-y-2 bg-white">
            <div className="flex gap-2 flex-wrap">
              <button onClick={toggleRecording} disabled={chatSending || uploading} className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors flex items-center gap-1 ${isRecording ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'}`}>
                {isRecording ? <><MicOff className="w-4 h-4" />Parar</> : <><Mic className="w-4 h-4" />Voz</>}
              </button>
              <label className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50">
                <ImageIcon className="w-4 h-4" />Fotos
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={chatSending || uploading} />
              </label>
              <label className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50">
                <Film className="w-4 h-4" />Video
                <input type="file" accept="video/*" multiple onChange={handleVideoUpload} className="hidden" disabled={chatSending || uploading} />
              </label>
              <label className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium cursor-pointer flex items-center gap-1 disabled:opacity-50">
                <Mic className="w-4 h-4" />Audio
                <input type="file" accept="audio/*" onChange={handleFileAudio} className="hidden" disabled={chatSending || uploading} />
              </label>
            </div>
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); }}} placeholder="Describí lo que necesitás..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" disabled={chatSending} />
              <button onClick={() => sendChat()} disabled={chatSending || !chatInput.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => sendChat('Sugiere items y precios para este presupuesto')} disabled={chatSending} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-medium hover:bg-amber-100 disabled:opacity-50">
                <Sparkles className="w-3 h-3 inline mr-1" />Sugerir items
              </button>
              <button onClick={() => sendChat('Genera el resumen ejecutivo y las condiciones de pago')} disabled={chatSending} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 disabled:opacity-50">
                Generar resumen
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}