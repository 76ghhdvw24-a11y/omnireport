'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { api, uploadFiles } from '@/lib/api';
import { Upload, X, Loader2, Mic, Image as ImageIcon, FileText, Type } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface Template { id: string; name: string; description: string | null; industry: string }
interface Client { id: string; name: string }

type InputMode = 'mixed' | 'images' | 'audio' | 'text';

export default function NewReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [clientId, setClientId] = useState('');
  const [language, setLanguage] = useState('es');
  const [inputMode, setInputMode] = useState<InputMode>('mixed');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => { fetchTemplates(); fetchClients(); }, []);

  const fetchTemplates = async () => { try { const res = await api.get('/api/v1/templates'); setTemplates(res.data.items); } catch {} };
  const fetchClients = async () => { try { const res = await api.get('/api/v1/clients'); setClients(res.data.items); } catch {} };

  const onDropImages = useCallback((acceptedFiles: File[]) => { setImageFiles((prev) => [...prev, ...acceptedFiles]); }, []);
  const onDropAudio = useCallback((acceptedFiles: File[]) => { setAudioFiles((prev) => [...prev, ...acceptedFiles]); }, []);

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onDropImages, accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  });
  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onDropAudio, accept: { 'audio/*': ['.mp3', '.m4a', '.wav', '.aac'] },
  });

  const removeImage = (i: number) => setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
  const removeAudio = (i: number) => setAudioFiles((prev) => prev.filter((_, idx) => idx !== i));

  const allFiles = [...imageFiles, ...audioFiles];
  const hasContent = title.trim().length > 0 && (allFiles.length > 0 || description.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUploading(true);
    setUploadProgress('Creando presupuesto...');
    try {
      const createRes = await api.post('/api/v1/reports', {
        title, description: description || undefined, templateId: templateId || undefined,
        clientId: clientId || undefined, language,
      });
      const reportId = createRes.data.id;
      if (allFiles.length > 0) {
        setUploadProgress('Subiendo archivos...');
        const formData = new FormData();
        for (const file of allFiles) formData.append('files', file);
        await uploadFiles(`/api/v1/reports/${reportId}/upload`, formData);
        setUploadProgress('Iniciando análisis...');
        await api.post(`/api/v1/reports/${reportId}/generate`);
      }
      toast.success('Presupuesto creado');
      router.push(`/reports/${reportId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear presupuesto');
      setIsUploading(false);
    }
  };

  const inputModes: { key: InputMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'mixed', label: 'Mixto', icon: <Upload className="w-4 h-4" />, desc: 'Fotos + audio + texto' },
    { key: 'images', label: 'Solo fotos', icon: <ImageIcon className="w-4 h-4" />, desc: 'Solo imágenes' },
    { key: 'audio', label: 'Solo audio', icon: <Mic className="w-4 h-4" />, desc: 'Solo grabación o audio' },
    { key: 'text', label: 'Solo texto', icon: <Type className="w-4 h-4" />, desc: 'Sin archivos, solo descripción' },
  ];

  if (isUploading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <NavBar />
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">{uploadProgress}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <h1 className="text-lg font-semibold text-gray-900">Nuevo Presupuesto</h1>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder="Ej: Inspección Vehicular - Toyota Camry" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Describe la inspección, notas, contexto..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">General (predeterminado)</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>

          {/* Input Mode Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de contenido</label>
            <div className="flex flex-wrap gap-2">
              {inputModes.map((m) => (
                <button key={m.key} type="button" onClick={() => setInputMode(m.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${inputMode === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{inputModes.find(m => m.key === inputMode)?.desc}</p>
          </div>

          {/* Image Upload */}
          {(inputMode === 'mixed' || inputMode === 'images') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
              <div {...getImageRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isImageDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                <input {...getImageInputProps()} />
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">{isImageDragActive ? 'Soltar imágenes aquí' : 'Arrastra o haz clic para seleccionar imágenes'}</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP</p>
              </div>
              {imageFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {imageFiles.map((file, i) => (
                    <div key={`img-${i}`} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-700 truncate max-w-[250px]">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <button type="button" onClick={() => removeImage(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audio Upload */}
          {(inputMode === 'mixed' || inputMode === 'audio') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audio</label>
              <div {...getAudioRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isAudioDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}`}>
                <input {...getAudioInputProps()} />
                <Mic className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-gray-600">{isAudioDragActive ? 'Soltar audio aquí' : 'Arrastra o haz clic para seleccionar audio'}</p>
                <p className="text-xs text-gray-500 mt-1">MP3, M4A, WAV, AAC</p>
              </div>
              {audioFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {audioFiles.map((file, i) => (
                    <div key={`aud-${i}`} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-700 truncate max-w-[250px]">{file.name}</span>
                        <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                      <button type="button" onClick={() => removeAudio(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Text-only mode hint */}
          {inputMode === 'text' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Modo solo texto</p>
                  <p className="text-xs text-blue-600 mt-1">El presupuesto se basará únicamente en la descripción que ingreses arriba. Asegúrate de incluir suficiente detalle.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <a href="/dashboard" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Cancelar</a>
            <button type="submit" disabled={!title || !hasContent} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">Crear Presupuesto</button>
          </div>
        </form>
      </div>
    </main>
  );
}