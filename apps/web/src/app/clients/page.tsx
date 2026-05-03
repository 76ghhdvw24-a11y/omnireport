'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';

interface Client { id: string; name: string; email: string | null; phone: string | null; address: string | null; taxId: string | null; createdAt: string }
const emptyForm = { name: '', email: '', phone: '', address: '', taxId: '' };

export default function ClientsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchClients();
  }, [user, authLoading, router]);

  const fetchClients = async () => { try { const res = await api.get('/api/v1/clients'); setClients(res.data.items); } catch {} finally { setIsLoading(false); } };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', taxId: c.taxId || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setIsSaving(true);
    try {
      const payload = { name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null, taxId: form.taxId || null };
      if (editing) { await api.patch(`/api/v1/clients/${editing.id}`, payload); toast.success('Cliente actualizado'); }
      else { await api.post('/api/v1/clients', payload); toast.success('Cliente creado'); }
      setShowModal(false); fetchClients();
    } catch { toast.error('Error al guardar'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return;
    try { await api.delete(`/api/v1/clients/${id}`); toast.success('Cliente eliminado'); fetchClients(); }
    catch { toast.error('Error al eliminar'); }
  };

  if (authLoading || isLoading) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" />Agregar Cliente</button>
        </div>
        {clients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center"><p className="text-gray-500">Sin clientes todavía. Agrega tu primer cliente.</p></div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">RUC / NIT</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{client.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{client.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{client.taxId || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(client)} className="text-gray-400 hover:text-blue-600 mr-2"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(client.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre del cliente" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="cliente@ejemplo.com" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">RUC / NIT</label><input type="text" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dirección del cliente" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Cancelar</button>
              <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}