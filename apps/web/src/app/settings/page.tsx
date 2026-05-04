'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  Loader2, Save, Users, Settings, UserPlus, Trash2, Shield, User,
  X, Copy, Check,
} from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Organization {
  id: string; name: string; slug: string; address: string | null; phone: string | null;
  taxId: string | null; country: string | null; currency: string; language: string; logoUrl: string | null;
}

interface Member {
  id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; createdAt: string;
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
  const t = useTranslations();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'team'>('general');

  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('es');

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [invitedPassword, setInvitedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchOrg();
    fetchMembers();
  }, [user, authLoading, router]);

  const fetchOrg = async () => {
    try {
      const res = await api.get('/api/v1/organization');
      const data = res.data;
      setOrg(data); setName(data.name || ''); setAddress(data.address || '');
      setPhone(data.phone || ''); setTaxId(data.taxId || '');
      setCountry(data.country || ''); setCurrency(data.currency || 'USD'); setLanguage(data.language || 'es');
    } catch (err) { console.error('Error al cargar organización', err); }
    finally { setIsLoadingOrg(false); }
  };

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const res = await api.get('/api/v1/organization/members');
      setMembers(res.data.items);
    } catch (err) { console.error('Error al cargar miembros', err); }
    finally { setIsLoadingMembers(false); }
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
      const res = await api.post('/api/v1/organization/logo', formData);
      setOrg(prev => prev ? { ...prev, logoUrl: res.data.logoUrl } : null);
      toast.success('Logo actualizado');
    } catch { toast.error('Error al subir logo'); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteFirstName.trim() || !inviteLastName.trim()) {
      toast.error('Completa todos los campos');
      return;
    }
    setIsInviting(true);
    try {
      const res = await api.post('/api/v1/organization/members/invite', {
        email: inviteEmail,
        firstName: inviteFirstName,
        lastName: inviteLastName,
        role: inviteRole,
      });
      setInvitedPassword(res.data.temporaryPassword);
      toast.success('Miembro invitado exitosamente');
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al invitar miembro');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await api.patch(`/api/v1/organization/members/${memberId}/role`, { role: newRole });
      toast.success('Rol actualizado');
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar rol');
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('¿Desactivar este miembro? No podrá acceder a la plataforma.')) return;
    try {
      await api.delete(`/api/v1/organization/members/${memberId}`);
      toast.success('Miembro desactivado');
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al desactivar miembro');
    }
  };

  const copyPassword = () => {
    if (invitedPassword) {
      navigator.clipboard.writeText(invitedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setInviteRole('MEMBER');
    setInvitedPassword(null);
    setCopiedPassword(false);
  };

  if (authLoading || isLoadingOrg) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>;
  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Settings className="w-4 h-4" />{t('settings.general')}
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'team' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-4 h-4" />{t('settings.team')}
          </button>
        </div>

        {activeTab === 'general' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.general')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.orgName')}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.taxId')}</label>
                <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 76.XXX.XXX-X" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.address')}</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dirección comercial" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.phone')}</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+56 9 XXXX XXXX" />
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Regional</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.country')}</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.language')}</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.currency')}</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {currencies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.branding')}</h2>
            <div className="flex items-center gap-4">
              {org?.logoUrl ? (
                <img src={org.logoUrl} alt="Logo" className="w-16 h-16 rounded-md object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold">{name.charAt(0).toUpperCase()}</div>
              )}
              <label className="cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                {t('settings.uploadLogo')}<input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('settings.saveChanges')}
            </button>
          </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('settings.teamTitle')}</h2>
                <p className="text-sm text-gray-500">{t('settings.teamSubtitle')}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4" />{t('settings.inviteMember')}
                </button>
              )}
            </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center text-gray-500">{t('settings.noMembers') || 'No hay miembros en el equipo'}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('settings.member')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('settings.role')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('settings.status')}</th>
                    {isAdmin && <th className="text-right py-3 px-4 font-medium text-gray-500">{t('settings.actions')}</th>}
                  </tr>
                </thead>
                  <tbody className="divide-y divide-gray-100">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                              {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isAdmin && member.id !== user.id ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="MEMBER">Miembro</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {member.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                               {member.role === 'ADMIN' ? t('settings.admin') : t('settings.member')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {member.isActive ? t('settings.active') : t('settings.inactive')}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            {member.id !== user.id && member.isActive && (
                              <button
                                onClick={() => handleDeactivate(member.id)}
                                className="text-gray-400 hover:text-red-500 transition"
                                title="Desactivar miembro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeInviteModal} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('settings.inviteTitle')}</h3>
              <button onClick={closeInviteModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {invitedPassword ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-800 font-medium mb-2">{t('settings.inviteSuccess')}</p>
                  <p className="text-xs text-green-600 mb-3">{t('settings.tempPassword')}</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-white border border-green-200 rounded px-3 py-1.5 text-sm font-mono text-green-900">{invitedPassword}</code>
                    <button onClick={copyPassword} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title={t('report.copied')}>
                      {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button onClick={closeInviteModal} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200">
                  {t('settings.close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.email')}</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="colleague@company.com" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.firstName')}</label>
                    <input type="text" value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.lastName')}</label>
                    <input type="text" value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.role')}</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="MEMBER">{t('settings.member')}</option>
                    <option value="ADMIN">{t('settings.admin')}</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">{t('settings.inviteRoleHelp')}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeInviteModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md">{t('settings.cancel')}</button>
                  <button type="submit" disabled={isInviting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {t('settings.invite')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
