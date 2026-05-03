'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Loader2, Save } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';

interface Organization {
  id: string; name: string; slug: string; address: string | null; phone: string | null;
  taxId: string | null; country: string | null; currency: string; language: string; logoUrl: string | null;
}

const languages = [
  { value: 'es', label: 'Español' }, { value: 'en', label: 'English' }, { value: 'pt', label: 'Português' },
];
const currencies = [
  { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (\u20ac)' }, { value: 'MXN', label: 'MXN (MX$)' },
  { value: 'COP', label: 'COP (COP$)' }, { value: 'ARS', label: 'ARS (AR$)' }, { value: 'BRL', label: 'BRL (R$)' },
  { value: 'PEN', label: 'PEN (S/)' }, { value: 'GBP', label: 'GBP (\u00a3)' }, { value: 'CLP', label: 'CLP (CLP$)' },
];
const countries = [
  { value: '', label: 'Seleccionar país...' },
  { value: 'CL', label: 'Chile' }, { value: 'AR', label: 'Argentina' }, { value: 'BR', label: 'Brasil' },
  { value: 'CO', label: 'Colombia' }, { value: 'MX', label: 'México' }, { value: 'PE', label: 'Perú' },
  { value: 'US', label: 'Estados Unidos' }, { value: 'ES', label: 'España' }, { value: 'GB', label: 'Reino Unido' },
  { value: 'OTHER', label: 'Otro' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchOrg();
  }, [user, authLoading, router]);

  const fetchOrg = async () => {
    try {
      const res = await api.get('/api/v1/organization');
      const data = res.data;
      setOrg(data); setName(data.name || ''); setAddress(data.address || '');
      setPhone(data.phone || ''); setTaxId(data.taxId || '');
      setCountry(data.country || ''); setCurrency(data.currency || 'USD'); setLanguage(data.language || 'es');
    } catch (err) { console.error('Error al cargar organización', err); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/api/v1/organization', { name, address: address || null, phone: phone || null, taxId: taxId || null, country: country || null, currency, language });
      toast.success('Organización actualizada');
    } catch { toast.error('Error al actualizar'); }
    finally { setIsSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append('logo', file);
    try {
      const res = await api.post('/api/v1/organization/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOrg(prev => prev ? { ...prev, logoUrl: res.data.logoUrl } : null);
      toast.success('Logo actualizado');
    } catch { toast.error('Error al subir logo'); }
  };

  if (authLoading || isLoading) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración de la Organización</h1>
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la organización</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUC / NIT / RUT</label>
                <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 76.XXX.XXX-X" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dirección comercial" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+56 9 XXXX XXXX" />
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Regional</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {currencies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
            <div className="flex items-center gap-4">
              {org?.logoUrl ? (
                <img src={org.logoUrl} alt="Logo" className="w-16 h-16 rounded-md object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold">{name.charAt(0).toUpperCase()}</div>
              )}
              <label className="cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Subir Logo<input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}