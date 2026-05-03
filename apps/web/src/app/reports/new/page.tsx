'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/api';
import { Upload, X, Loader2, Mic, Image } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';

interface Template { id: string; name: string; description: string | null; industry: string }
interface Client { id: string; name: string }

export default function NewReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [clientId, setClientId] = useState('');
  const [language, setLanguage] = useState('es');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => { fetchTemplates(); fetchClients(); }, []);

  const fetchTemplates = async () => { try { const res = await api.get('/api/v1/templates'); setTemplates(res.data.items); } catch {} };
  const fetchClients = async () => { try { const res = await api.get('/api/v1/clients'); setClients(res.data.items); } catch {} };

  const onDrop = useCallback((acceptedFiles: File[]) => { setFiles((prev) => [...prev, ...acceptedFiles]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'], 'audio/*': ['.mp3', '.m4a', '.wav', '.aac'] },
  });
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

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
      if (files.length > 0) {
        setUploadProgress('Subiendo archivos...');
        const formData = new FormData();
        for (const file of files) formData.append('files', file);
        await api.post(`/api/v1/reports/${reportId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setUploadProgress('Iniciando análisis...');
      await api.post(`/api/v1/reports/${reportId}/generate`);
      toast.success('Presupuesto creado y análisis iniciado');
      router.push(`/reports/${reportId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear presupuesto');
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
        {isUploading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">{uploadProgress}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-semibold text-gray-900">Nuevo Presupuesto</h1>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder="Ej: Inspección Vehicular - Toyota Camry" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Contexto opcional sobre esta inspección..." />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes y Audio</label>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">{isDragActive ? 'Soltar archivos aquí' : 'Arrastra o haz clic para seleccionar'}</p>
                <p className="text-xs text-gray-500 mt-1">Imágenes (JPG, PNG) · Audio (MP3, M4A)</p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? <Image className="w-4 h-4 text-blue-500" /> : <Mic className="w-4 h-4 text-purple-500" />}
                      <span className="text-sm text-gray-700 truncate max-w-[250px]">{file.name}</span>
                      <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <a href="/dashboard" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Cancelar</a>
              <button type="submit" disabled={!title || files.length === 0} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">Crear y Analizar</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}