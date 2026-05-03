import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const automotiveTemplate = await prisma.template.upsert({
    where: { id: 'automotive-template' },
    update: {},
    create: {
      id: 'automotive-template',
      name: 'Inspección Automotriz Estándar',
      description: 'Template para inspección técnica de vehículos y diagnóstico mecánico',
      industry: 'AUTOMOTIVE',
      systemPrompt: `Eres un experto mecánico automotriz con más de 20 años de experiencia en diagnosis de vehículos.

Analiza las imágenes proporcionadas y la transcripción del audio para producir un informe técnico completo.

Componentes a analizar:
1. MOTOR Y TRANSMISIÓN
   - Estado del motor (ruidos, vibraciones, humo)
   - Niveles de fluidos (aceite, refrigerante, transmisión)
   - Estado de correas y componentes asociados

2. SISTEMA DE FRENOS
   - Estado de pastillas y discos
   - Líneas de freno
   - Nivel y estado del líquido de frenos

3. SUSPENSIÓN Y DIRECCIÓN
   - Amortiguadores
   - Rótulas y bujes
   - Sistema de dirección

4. SISTEMA ELÉCTRICO
   - Batería y conexiones
   - Alternador
   - Sistema de luces y señales

5. CARROCERÍA Y PINTURA
   - Estado de la chapa
   - Óxido o corrosión
   - Estado de la pintura

Evalúa cada componente con:
- Condición: BUENO | NECESITA_REPARACIÓN | CRÍTICO
- Urgencia: BAJA | MEDIA | ALTA | CRÍTICA
- Estimación de costo en USD

Para problemas críticos, proporciona:
- Riesgo de seguridad
- Tiempo máximo recomendado antes de reparar
- Impacto potencial en otros componentes

Sé específico en tus hallazgos. Usa terminología técnica apropiada pero comprensible.`,
      outputFormat: {
        findings: [
          {
            component: 'string',
            description: 'string',
            condition: 'GOOD | NEEDS_REPAIR | CRITICAL',
            severity: 'LOW | MEDIUM | HIGH | CRITICAL',
            confidence: 0.0,
            estimatedCost: 0.0,
            urgency: 'LOW | MEDIUM | HIGH | CRITICAL',
            safetyRisk: 'boolean',
            recommendedAction: 'string',
          },
        ],
        executiveSummary: 'string',
        overallCondition: 'EXCELLENT | GOOD | FAIR | POOR | CRITICAL',
        recommendedAction: 'string',
        estimatedTotalCost: 0.0,
        criticalIssues: [
          {
            issue: 'string',
            impact: 'string',
            maxTimeBeforeRepair: 'string',
          },
        ],
      },
      isActive: true,
    },
  });

  console.log(`✅ Created/updated template: ${automotiveTemplate.name}`);

  const constructionTemplate = await prisma.template.upsert({
    where: { id: 'construction-template' },
    update: {},
    create: {
      id: 'construction-template',
      name: 'Inspección de Obra',
      description: 'Template para inspección de construcción y supervisión de proyectos',
      industry: 'CONSTRUCTION',
      systemPrompt: `Eres un inspector de construcción certificado con experiencia en proyectos residenciales y comerciales.

Analiza las imágenes y notas de la visita para producir un informe de inspección completo.

Áreas a evaluar:
1. ESTRUCTURAL
   - Cimentación
   - Elementos de carga
   - Muros y columnas

2. ACABADOS
   - Pisos y revestimientos
   - Pintura y estuco
   - Carpintería

3. INSTALACIONES
   - Eléctrica
   - Plomería
   - HVAC

4. SEGURIDAD
   - Señalización
   - Protección en altura
   - Equipos de protección

5. CONFORMIDAD
   - Cumplimiento de planos
   - Calidad de materiales
   - Normativas aplicables`,
      outputFormat: {
        findings: [
          {
            area: 'string',
            description: 'string',
            compliance: 'COMPLIANT | NON_COMPLIANT | PARTIAL',
            severity: 'LOW | MEDIUM | HIGH | CRITICAL',
            confidence: 0.0,
            estimatedCost: 0.0,
          },
        ],
        executiveSummary: 'string',
        overallCompliance: 'FULL | PARTIAL | NON_COMPLIANT',
        recommendedAction: 'string',
        estimatedTotalCost: 0.0,
      },
      isActive: true,
    },
  });

  console.log(`✅ Created/updated template: ${constructionTemplate.name}`);

  const manufacturingTemplate = await prisma.template.upsert({
    where: { id: 'manufacturing-template' },
    update: {},
    create: {
      id: 'manufacturing-template',
      name: 'Inspección de Producción',
      description: 'Template para control de calidad y inspección de línea de producción',
      industry: 'MANUFACTURING',
      systemPrompt: `Eres un especialista en control de calidad y procesos de manufactura.

Analiza las imágenes y observaciones para producir un informe de inspección de producción.

Áreas a evaluar:
1. CALIDAD DEL PRODUCTO
   - Dimensiones y tolerancias
   - Acabados y superficie
   - Defectos visibles

2. PROCESO DE PRODUCCIÓN
   - Calibración de equipos
   - Cumplimiento de procedimientos
   - Tiempos de ciclo

3. EQUIPAMIENTO
   - Estado de maquinaria
   - Mantenimiento requerido
   - Capacidad actual

4. SEGURIDAD
   - Condiciones de trabajo
   - EPP
   - Procedimientos de seguridad

5. DOCUMENTACIÓN
   - Registros de producción
   - Lotes y trazabilidad
   - Certificaciones`,
      outputFormat: {
        findings: [
          {
            area: 'string',
            description: 'string',
            status: 'PASS | FAIL | WARNING',
            severity: 'LOW | MEDIUM | HIGH | CRITICAL',
            confidence: 0.0,
          },
        ],
        executiveSummary: 'string',
        overallQuality: 'EXCELLENT | GOOD | ACCEPTABLE | POOR',
        recommendedAction: 'string',
      },
      isActive: true,
    },
  });

  console.log(`✅ Created/updated template: ${manufacturingTemplate.name}`);

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
