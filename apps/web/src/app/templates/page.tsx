'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Loader2, Plus, Pencil, Trash2, X, Globe, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { NavBar } from '@/components/navbar';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  systemPrompt: string;
  outputFormat: Record<string, unknown>;
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

const INDUSTRY_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'AUTOMOTIVE', label: 'Automotriz' },
  { value: 'CONSTRUCTION', label: 'Construcción' },
  { value: 'MANUFACTURING', label: 'Manufactura' },
  { value: 'INSURANCE', label: 'Seguros' },
  { value: 'REAL_ESTATE', label: 'Bienes Raíces' },
];

const INDUSTRY_LABELS: Record<string, string> = {
  GENERAL: 'General',
  AUTOMOTIVE: 'Automotriz',
  CONSTRUCTION: 'Construcción',
  MANUFACTURING: 'Manufactura',
  INSURANCE: 'Seguros',
  REAL_ESTATE: 'Bienes Raíces',
};

const INDUSTRY_PROMPTS: Record<string, string> = {
  AUTOMOTIVE: `Eres un experto mecánico automotriz con más de 20 años de experiencia en diagnosis de vehículos.

Analiza las imágenes proporcionadas y la transcripción del audio para producir un presupuesto técnico completo.

Componentes a analizar:
1. MOTOR Y TRANSMISIÓN — estado, fluidos, correas
2. SISTEMA DE FRENOS — pastillas, discos, líquido
3. SUSPENSIÓN Y DIRECCIÓN — amortiguadores, rótulas
4. SISTEMA ELÉCTRICO — batería, alternador, luces
5. CARROCERÍA Y PINTURA — chapa, óxido, pintura

Para cada hallazgo indica: descripción, severidad (CRITICAL/HIGH/MEDIUM/LOW/INFO), costo estimado y acción recomendada.`,

  CONSTRUCTION: `Eres un inspector de construcción certificado con experiencia en proyectos residenciales y comerciales.

Analiza las imágenes y notas de la visita para producir un presupuesto de inspección completo.

Áreas a evaluar:
1. ESTRUCTURAL — cimentación, muros, columnas
2. ACABADOS — pisos, pintura, carpintería
3. INSTALACIONES — eléctrica, plomería, HVAC
4. SEGURIDAD — señalización, protección en altura
5. CONFORMIDAD — cumplimiento de planos y normativas

Para cada hallazgo indica: descripción, severidad, conformidad, costo estimado y acción recomendada.`,

  MANUFACTURING: `Eres un especialista en control de calidad y procesos de manufactura.

Analiza las imágenes y observaciones para producir un presupuesto de inspección de producción.

Áreas a evaluar:
1. CALIDAD DEL PRODUCTO — dimensiones, acabados, defectos
2. PROCESO DE PRODUCCIÓN — calibración, procedimientos, tiempos
3. EQUIPAMIENTO — estado de maquinaria, mantenimiento
4. SEGURIDAD — condiciones de trabajo, EPP, procedimientos
5. DOCUMENTACIÓN — registros, trazabilidad, certificaciones

Para cada hallazgo indica: descripción, severidad, estado (PASS/FAIL/WARNING), costo estimado y acción recomendada.`,

  INSURANCE: `Eres un perito de seguros especializado en evaluación de daños y riesgos.

Analiza las imágenes y documentación proporcionada para producir un presupuesto de evaluación completo.

Aspectos a evaluar:
1. DAÑOS — tipo, extensión, causa probable
2. RIESGO — probabilidad, impacto potencial
3. VALORACIÓN — costo de reparación/reemplazo
4. COBERTURA — alcance de la póliza sugerida
5. RECOMENDACIONES — prevención, mitigación

Para cada hallazgo indica: descripción, severidad, costo estimado, riesgo y acción recomendada.`,

  REAL_ESTATE: `Eres un tasador inmobiliario experto en inspección de propiedades.

Analiza las imágenes y datos proporcionados para producir un presupuesto de inspección inmobiliaria.

Aspectos a evaluar:
1. ESTRUCTURA — cimentación, muros, techo
2. INSTALACIONES — eléctrica, plomería, gas
3. ACABADOS — pisos, paredes, baños, cocina
4. AMBIENTES — distribución, iluminación, ventilación
5. CONDICIONES — mantenimiento general, eficiencia energética

Para cada hallazgo indica: descripción, severidad, costo estimado y acción recomendada.`,

  GENERAL: `Eres un experto en inspecciones técnicas con amplia experiencia en evaluación de activos.

Analiza las imágenes y audio proporcionados para producir un presupuesto de inspección completo.

Para cada hallazgo indica:
- Descripción detallada del problema
- Severidad (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- Costo estimado de reparación/reemplazo
- Cantidad (si aplica)
- Acción recomendada

Incluye un resumen ejecutivo y las condiciones de pago sugeridas.`,
};

const INDUSTRY_FORMATS: Record<string, Record<string, unknown>> = {
  AUTOMOTIVE: {
    findings: [{ component: '', description: '', condition: '', severity: '', estimatedCost: 0, quantity: 1, recommendedAction: '' }],
    executiveSummary: '',
    recommendedAction: '',
    estimatedTotalCost: 0,
  },
  CONSTRUCTION: {
    findings: [{ area: '', description: '', compliance: '', severity: '', estimatedCost: 0, quantity: 1, recommendedAction: '' }],
    executiveSummary: '',
    recommendedAction: '',
    estimatedTotalCost: 0,
  },
  MANUFACTURING: {
    findings: [{ area: '', description: '', status: '', severity: '', estimatedCost: 0, quantity: 1, recommendedAction: '' }],
    executiveSummary: '',
    recommendedAction: '',
    estimatedTotalCost: 0,
  },
  INSURANCE: {
    findings: [{ area: '', description: '', severity: '', estimatedCost: 0, quantity: 1, recommendedAction: '', riskLevel: '' }],
    executiveSummary: '',
    recommendedAction: '',
    estimatedTotalCost: 0,
  },
  REAL_ESTATE: {
    findings: [{ area: '', description: '', severity: '', estimatedCost: 0, quantity: 1, recommendedAction: '' }],
    executiveSummary: '',
    recommendedAction: '',
    estimatedTotalCost: 0,
  },
  GENERAL: {
    findings: [{ description: '', severity: '', estimatedCost: 0, quantity: 1, recommendedAction: '' }],
    executiveSummary: '',
    recommendedAction: '',
    estimatedTotalCost: 0,
  },
};

const emptyForm = {
  name: '',
  description: '',
  industry: 'GENERAL',
  systemPrompt: INDUSTRY_PROMPTS.GENERAL,
};

export default function TemplatesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [outputFormat, setOutputFormat] = useState(JSON.stringify(INDUSTRY_FORMATS.GENERAL, null, 2));

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchTemplates();
  }, [user, authLoading, router]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/v1/templates?all=true');
      setTemplates(res.data.items);
    } catch { toast.error('Error al cargar plantillas'); }
    finally { setIsLoading(false); }
  };

  const handleIndustryChange = (industry: string) => {
    setForm((prev) => ({
      ...prev,
      industry,
      systemPrompt: INDUSTRY_PROMPTS[industry] || prev.systemPrompt,
    }));
    setOutputFormat(JSON.stringify(INDUSTRY_FORMATS[industry] || INDUSTRY_FORMATS.GENERAL, null, 2));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', industry: 'GENERAL', systemPrompt: INDUSTRY_PROMPTS.GENERAL });
    setOutputFormat(JSON.stringify(INDUSTRY_FORMATS.GENERAL, null, 2));
    setShowAdvanced(false);
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    if (t.organizationId === null) {
      toast.error('No se pueden editar plantillas globales');
      return;
    }
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || '',
      industry: t.industry,
      systemPrompt: t.systemPrompt,
    });
    setOutputFormat(JSON.stringify(t.outputFormat, null, 2));
    setShowAdvanced(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!form.systemPrompt.trim()) { toast.error('El prompt es obligatorio'); return; }

    let parsedFormat: Record<string, unknown>;
    try {
      parsedFormat = JSON.parse(outputFormat);
    } catch {
      toast.error('El formato de salida tiene errores de JSON. Revisá la sección Avanzado.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        industry: form.industry,
        systemPrompt: form.systemPrompt,
        outputFormat: parsedFormat,
      };

      if (editing) {
        await api.patch(`/api/v1/templates/${editing.id}`, payload);
        toast.success('Plantilla actualizada');
      } else {
        await api.post('/api/v1/templates', payload);
        toast.success('Plantilla creada');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (t: Template) => {
    if (t.organizationId === null) {
      toast.error('No se pueden eliminar plantillas globales');
      return;
    }
    if (!confirm('¿Seguro que deseas eliminar esta plantilla?')) return;
    try {
      await api.delete(`/api/v1/templates/${t.id}`);
      toast.success('Plantilla eliminada');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleToggleActive = async (t: Template) => {
    if (t.organizationId === null) return;
    try {
      await api.patch(`/api/v1/templates/${t.id}`, { isActive: !t.isActive });
      toast.success(t.isActive ? 'Plantilla desactivada' : 'Plantilla activada');
      fetchTemplates();
    } catch { toast.error('Error al actualizar'); }
  };

  if (authLoading || isLoading) return <main className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></main>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Plantillas</h1>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" />Nueva Plantilla</button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center"><p className="text-gray-500">No hay plantillas. Crea una para personalizar los presupuestos.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id} className={`bg-white rounded-lg shadow border ${t.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {t.organizationId === null ? (
                        <Globe className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Building2 className="w-4 h-4 text-purple-500" />
                      )}
                      <h3 className="font-semibold text-gray-900 text-sm">{t.name}</h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{INDUSTRY_LABELS[t.industry] || t.industry}</p>
                  {t.description && <p className="text-xs text-gray-600 line-clamp-2 mb-3">{t.description}</p>}
                  <p className="text-xs text-gray-400 line-clamp-2">{t.systemPrompt.substring(0, 100)}...</p>
                </div>
                <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t.organizationId === null ? 'Global' : 'Personalizada'}</span>
                  <div className="flex items-center gap-1">
                    {t.organizationId !== null && (
                      <>
                        <button onClick={() => handleToggleActive(t)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">
                          {t.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(t)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Inspección Eléctrica" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Descripción breve de la plantilla" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
                <select value={form.industry} onChange={(e) => handleIndustryChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {INDUSTRY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Al cambiar industria se carga un prompt sugerido.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones para la IA *</label>
                <textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Eres un experto en inspecciones técnicas...&#10;&#10;Analiza las imágenes y audio proporcionados..." />
                <p className="text-xs text-gray-400 mt-1">Describe qué debe analizar la IA y cómo estructurar la respuesta.</p>
              </div>

              <div className="border border-gray-200 rounded-md">
                <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md">
                  <span>Configuración avanzada</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showAdvanced && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estructura de la respuesta (JSON)</label>
                    <textarea value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
                    <p className="text-xs text-gray-400 mt-1">Define los campos que la IA incluirá en cada hallazgo del presupuesto. Se genera automáticamente según la industria.</p>
                  </div>
                )}
              </div>
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