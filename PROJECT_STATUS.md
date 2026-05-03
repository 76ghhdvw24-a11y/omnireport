# OmniReport AI — Estado del Proyecto y Roadmap

## Resumen

OmniReport AI es una aplicación SaaS multi-tenant para generación automática de reportes de inspección usando IA multimodal (imágenes + audio). Los usuarios suben fotos/audio, la IA analiza y genera un reporte con hallazgos, severidad, resumen ejecutivo y acciones recomendadas.

---

## Estado Actual (Mayo 2026)

### Funcionalidad Operativa

| Feature | Estado | Notas |
|---------|--------|-------|
| Registro/Login | ✅ Funcional | JWT access token, BCrypt password |
| Multi-tenant (Organización) | ✅ Funcional | Organización creada con registro, `orgId` en middleware |
| Crear reporte | ✅ Funcional | Título + descripción + subida de archivos |
| Subida de imágenes/audio | ✅ Funcional | Proxy por API (multer → S3), sin CORS directo |
| URLs firmadas S3 | ✅ Funcional | Presigned URLs para lectura de imágenes |
| Transcripción de audio | ✅ Funcional | OpenAI Whisper (hardcodeado `language: 'en'`) |
| Análisis con IA | ✅ Funcional | NVIDIA API → `google/gemma-4-31b-it` |
| Generación de PDF | ✅ Funcional | PDFKit, descargable desde detalle |
| Dashboard | ✅ Funcional | Lista de reportes con badges de estado/severidad |
| Templates por industria | ⚠️ Parcial | Existen en DB (automotriz, construcción, manufactura) pero NO se exponen en UI |
| Eliminación de reportes | ✅ Funcional | Con cleanup de archivos S3 |
| RabbitMQ/BullMQ worker | ✅ Funcional | Concurrency: 5, Redis-backed |

### Stack Técnico

| Componente | Tecnología |
|------------|------------|
| Monorepo | npm workspaces + TypeScript project references |
| API | Express.js (apps/api) |
| Frontend | Next.js 14 App Router (apps/web) |
| Worker | BullMQ + tsx (apps/worker) |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Cache/Queue | Redis 7 |
| Almacenamiento | AWS S3 (us-east-2) |
| IA | NVIDIA API → google/gemma-4-31b-it |
| Transcripción | OpenAI Whisper API |
| PDF | PDFKit |
| Auth | JWT (15min access, 7d refresh — refresh no implementado en frontend) |
| Containerización | Docker Compose |

### Estructura del Proyecto

```
OmniReport/
├── apps/
│   ├── api/          # Express REST API
│   ├── web/          # Next.js frontend
│   └── worker/       # BullMQ AI processing worker
├── packages/
│   ├── domain/       # DDD entities + repository interfaces
│   ├── shared/       # Zod schemas, types, enums
│   ├── infrastructure/  # S3, AI, Whisper, JWT, PDF, Queue, Prisma repos
│   └── use-cases/    # GenerateReportUseCase (Gemini path, no usado actualmente)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.sql / seed templates
└── scripts/
    └── seed.ts       # 3 templates de industria
```

### Credenciales de Desarrollo

- DB: `omnireport:omnireport_password@localhost:5432/omnireport`
- Redis: `localhost:6379`
- S3 bucket: `omnireport-bucket` (us-east-2)
- Test user: `test@test.com / password123` (org: Test Org)

---

## Problemas Conocidos y Limitaciones

### Críticos

1. **NVIDIA_API_KEY hardcodeada en `.env`** — La key `nvapi-kV2a8...` está expuesta en `.env.example`. Rotar inmediatamente.
2. **Row Level Security no aplicado** — La migración `02_add_row_level_security.sql` existe pero nunca se ejecutó. Cualquier usuario autenticado puede ver datos de otras organizaciones.
3. **tsx watch cachea módulos** — Cambios en `packages/` no siempre se reflejan sin restart. La lógica de NVIDIA AI está directamtente inline en el worker por este motivo.

### Funcionales

4. **Sin selector de idioma** — UI en inglés, templates de AI en español, Whisper forzado a `language: 'en'`. Todo debería ser configurable.
5. **Sin datos del cliente** — Un presupuesto necesita un destinatario. No existe modelo `Client`.
6. **Sin datos del negocio** — Faltan campos: dirección, teléfono, RUC/CI, moneda, idioma en `Organization`.
7. **Sin precios/costos** — `Finding.estimatedCost` existe en tipos pero nunca se solicita al AI ni se muestra en UI.
8. **Sin selección de template en UI** — Los 3 templates existen pero el formulario de creación no los ofrece.
9. **Sin edición posterior** — No se puede editar un reporte después de generado. Falta estado `DRAFT`.
10. **Sin refresh token en frontend** — Solo se guarda `accessToken`; cuando expira (15min), el usuario debe re-loguearse.

### UX

11. **Dashboard básico** — Sin filtros, búsqueda, paginación real, ni KPIs.
12. **Sin gestión de organización** — No hay UI para settings, miembros, logo.
13. **Sin gestión de usuario** — No hay perfil, cambio de password, roles.
14. **PDF genérico** — No incluye logo, datos de empresa, cliente, ni formato de presupuesto.
15. **Sin vista previa** — No se previsualiza el PDF antes de descargarlo.

---

## Modelo de Datos Actual (Prisma)

```prisma
model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  plan        Plan     @default(FREE)
  maxReports  Int      @default(10)
  maxStorage  BigInt   @default(1073741824) // 1GB
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
  reports     Report[]
  templates   Template[]
}

model User {
  id             String   @id @default(uuid())
  email          String   @unique
  passwordHash   String
  firstName      String
  lastName       String
  role           UserRole @default(MEMBER)
  isActive       Boolean  @default(true)
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  reports        Report[]
}

model Report {
  id                String       @id @default(uuid())
  title             String
  description       String?
  status            ReportStatus @default(PENDING)
  severity          Severity?
  organizationId    String
  userId            String
  templateId        String?
  audioUrl          String?
  audioTranscript   String?
  imageUrls         String[]
  findings          Json?
  executiveSummary  String?
  recommendedAction String?
  aiModel           String?
  aiResponseTime    Int?
  metadata          Json?
  tags              String[]
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  completedAt      DateTime?
  organization      Organization @relation(fields: [organizationId], references: [id])
  user              User         @relation(fields: [userId], references: [id])
  template          Template?    @relation(fields: [templateId], references: [id])
}

model Template {
  id             String   @id @default(uuid())
  name           String
  description    String?
  industry       Industry @default(GENERAL)
  systemPrompt   String
  outputFormat   Json
  isActive        Boolean  @default(true)
  organizationId  String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

enum Plan        { FREE PRO ENTERPRISE }
enum UserRole    { ADMIN MEMBER }
enum ReportStatus { PENDING PROCESSING TRANSCRIBING ANALYZING COMPLETED FAILED }
enum Severity    { CRITICAL HIGH MEDIUM LOW INFO }
enum Industry    { GENERAL AUTOMOTIVE CONSTRUCTION MANUFACTURING INSURANCE REAL_ESTATE }
```

---

## Roadmap Propuesto

### FASE 1 — Convertir en Presupuesto Real

Prioridad: Sin esto, la app no es un presupuesto, es un generador de hallazgos.

#### 1.1 Configuración del Negocio

**Modelo:** Agregar campos a `Organization`:
```
address     String?
phone       String?
taxId       String?    // RUC, CI, NIT, etc.
currency    String     @default("USD")
language    String     @default("es")
logoUrl     String?    // ya existe, falta upload mechanism
```

**API:**
- `GET /api/v1/organization` — Obtener datos de la organización del usuario
- `PATCH /api/v1/organization` — Actualizar datos
- `POST /api/v1/organization/logo` — Subir logo (multer → S3)

**Frontend:**
- Página `/settings` con formulario de datos del negocio
- Preview del logo, selector de idioma y moneda

#### 1.2 Modelo de Cliente

**Modelo nuevo:**
```prisma
model Client {
  id             String   @id @default(uuid())
  name           String
  email          String?
  phone          String?
  address        String?
  taxId          String?    // documento de identidad/RUC
  organizationId String
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  reports        Report[]
}
```

**Agregar a Report:** `clientId String?`

**API:**
- CRUD completo: `GET/POST/PATCH/DELETE /api/v1/clients`

**Frontend:**
- Selector de cliente en formulario de creación de reporte
- Modal para crear cliente nuevo inline
- Página `/clients` con lista y CRUD

#### 1.3 Precios y Costos

**Actualizar AI prompt para incluir:**
```json
{
  "findings": [{
    "description": "string",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
    "confidence": 0.0,
    "estimatedCost": 0.0,
    "component": "string"
  }],
  "executiveSummary": "string",
  "recommendedAction": "string",
  "estimatedTotalCost": 0.0
}
```

**Agregar campos a Report:**
```prisma
subtotal      Float?
tax           Float?
total         Float?
currency      String?
```

**Frontend:**
- Tabla de findings con columna de costo estimado
- Totales al final del reporte
- Edición de montos antes de finalizar

#### 1.4 Soporte Multi-Idioma

**Backend:**
- Worker: usar `organization.language` o `report.language` para el prompt del AI y Whisper
- PDF: generar en el idioma del reporte
- Whisper: pasar `language` dinámico en vez de hardcodear `'en'`

**Frontend:**
- Agregar `next-intl` o sistema simple de traducciones
- Soportar: `es`, `en`, `pt`
- Selector de idioma en header y en organización
- Textos de UI traducidos

**AI Prompt:** Modificar para incluir instrucción de idioma:
```
Respond in ${language}. All findings, summaries, and recommendations must be in ${language}.
```

---

### FASE 2 — Interactividad (Dejar de ser "Submit y Espera")

Prioridad: Diferenciador de producto. Actualmente la IA es un black box.

#### 2.1 Estado DRAFT y Edición

**Cambios al modelo:**
- Agregar `DRAFT` al enum `ReportStatus` (entre PENDING y PROCESSING, o como estado posterior a COMPLETED)
- Flujo: `PENDING → PROCESSING → COMPLETED → DRAFT (editable) → APPROVED`

**API:**
- `PATCH /api/v1/reports/:id` — Expandir para permitir editar: title, description, findings, executiveSummary, recommendedAction, estimatedCosts, clientId

**Frontend:**
- Botón "Edit" en reporte completado
- Formulario de edición para cada sección (findings, summary, costs)
- Botón "Approve / Finalize" para pasar a APPROVED (readonly)
- Vista de edición inline con campos editables

#### 2.2 AI Agent Conversacional

**Nuevo modelo:**
```prisma
model ChatMessage {
  id         String   @id @default(uuid())
  reportId   String
  role       String   // "user" | "assistant" | "system"
  content    String
  createdAt  DateTime @default(now())
  report     Report   @relation(fields: [reportId], references: [id])
}
```

**API:**
- `GET /api/v1/reports/:id/chat` — Obtener historial de chat
- `POST /api/v1/reports/:id/chat` — Enviar mensaje, recibir respuesta del AI
- El AI tiene contexto del reporte actual (imágenes, transcript previo, findings generados)

**Frontend:**
- Panel de chat lateral o inferior en la vista de reporte
- Botón "Ask AI" o "Modify" para iniciar conversación
- Ejemplos: "Cambia la severidad del hallazgo 1 a MEDIUM", "Agrega $50 al costo estimado", "Reescribe el resumen en términos más simples"
- El agente puede modificar campos del reporte en respuesta a instrucciones

**Implementación del Agent:**
- Endpoint POST que recibe mensaje + contexto del reporte
- Llama a NVIDIA API con system prompt que incluye el reporte actual como contexto
- El AI responde con JSON que puede incluir modificaciones a campos del reporte
- El frontend presenta las modificaciones sugeridas y el usuario acepta/rechaza

#### 2.3 Template Selection en UI

**API:**
- `GET /api/v1/templates` — Listar templates de la organización + globales

**Frontend:**
- En formulario de crear reporte: dropdown "Tipo de inspección"
- Cargar templates via API
- Si no se selecciona, usar el default (General)
- Mostrar descripción del template seleccionado

---

### FASE 3 — UI/UX Profesional

Prioridad: Lo que hace que la app se sienta profesional vs prototipo.

#### 3.1 Dashboard Mejorado

- KPIs: Total reportes, presupuestos este mes, monto total estimado, tasa de aprobación
- Filtros: por estado, fecha, cliente, severidad
- Búsqueda por título
- Paginación real (skip/take)
- Ordenamiento por fecha, severidad, estado

#### 3.2 Gestión de Organización

- Página `/settings` con tabs:
  - **General**: Nombre, dirección, teléfono, RUC, moneda, idioma
  - **Branding**: Logo upload, colores (para PDF)
  - **Equipo**: Lista de miembros, invitaciones, roles
  - **Plan**: Info del plan actual, límites, upgrade

#### 3.3 Vista Previa de PDF

- Componente de preview que muestra cómo se verá el presupuesto
- Incluye: logo de empresa, datos de empresa, datos de cliente, tabla de hallazgos con costos, totales, fecha, número de presupuesto
- Botón "Download PDF" desde la preview

#### 3.4 Notificaciones

- Notificación in-app (toast) cuando un reporte termina de procesarse
- Opcional: email via SendGrid/Resend
- Reemplazar polling (cada 3s) con WebSocket o SSE para updates en tiempo real

---

## APIs necesarios (Endpoints nuevos)

| Method | Path | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/organization` | Obtener datos de la organización |
| `PATCH` | `/api/v1/organization` | Actualizar organización |
| `POST` | `/api/v1/organization/logo` | Subir logo |
| `GET` | `/api/v1/clients` | Listar clientes |
| `POST` | `/api/v1/clients` | Crear cliente |
| `PATCH` | `/api/v1/clients/:id` | Editar cliente |
| `DELETE` | `/api/v1/clients/:id` | Eliminar cliente |
| `GET` | `/api/v1/templates` | Listar templates disponibles |
| `GET` | `/api/v1/reports/:id/chat` | Historial de chat |
| `POST` | `/api/v1/reports/:id/chat` | Enviar mensaje al agente AI |
| `PATCH` | `/api/v1/reports/:id` | Expandir para editar findings, costs, etc. |

---

## Cambios al Modelo de Datos (Resumen)

```prisma
// Agregar a Organization:
address     String?
phone       String?
taxId       String?
currency    String     @default("USD")
language    String     @default("es")

// Agregar a Report:
clientId    String?
subtotal    Float?
tax         Float?
total       Float?
currency    String?
language    String?

// Agregar a ReportStatus:
// DRAFT, APPROVED

// Nuevo modelo:
model Client {
  id             String   @id @default(uuid())
  name           String
  email          String?
  phone          String?
  address        String?
  taxId          String?
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  reports        Report[]
}

// Nuevo modelo:
model ChatMessage {
  id         String   @id @default(uuid())
  reportId   String
  role       String   // "user" | "assistant" | "system"
  content    String
  createdAt  DateTime @default(now())
  report     Report   @relation(fields: [reportId], references: [id])
}
```

---

## Notas Técnicas para el Agente

### tsx Watch Caching Issue
`tsx watch` no detecta cambios en `packages/infrastructure` ni `packages/use-cases`. La solución actual es inyectar dependencias directamente en el worker o hacer `tsc --build --force` seguido de restart. Para las fases siguientes, considerar:
- Usar `nodemon` con `tsx` en vez de `tsx watch`
- O compilar el worker a JS puro y ejecutarlo con `node dist/index.js`

### S3 Region
El bucket está en `us-east-2`, no `us-east-1`. Todos los defaults deben ser `us-east-2`.

### Upload Flow
El flujo actual es: Frontend → `POST /api/v1/reports/:id/upload` (multipart) → API sube a S3. NO usar presigned PUT directo desde el browser (CORS issues).

### Presigned URLs para Lectura
`GET /api/v1/reports/:id` genera presigned URLs para images/audio. Los usuarios no acceden directamente a S3.

### Worker Inlining
La lógica de NVIDIA AI está directamente en `apps/worker/src/index.ts` como función `callNvidiaAI()` debido al problema de caché de tsx. Si se resuelve, se puede mover a `NvidiaService` en el paquete de infraestructura (el archivo ya existe: `packages/infrastructure/src/ai/nvidia.service.ts`).

### Quantum del Código por Archivo Clave

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `apps/api/src/routes/reports.routes.ts` | ~300 | CRUD + upload + generate + PDF |
| `apps/api/src/routes/auth.routes.ts` | ~120 | Register + login + me |
| `apps/api/src/index.ts` | ~90 | Express setup, middleware, route mounting |
| `apps/api/src/middleware/auth.middleware.ts` | ~40 | JWT verification, req.userId/orgId |
| `apps/worker/src/index.ts` | ~220 | BullMQ worker, callNvidiaAI inline, job processing |
| `apps/web/src/app/reports/new/page.tsx` | ~185 | Upload form with dropzone |
| `apps/web/src/app/reports/[id]/page.tsx` | ~280 | Report detail with polling |
| `apps/web/src/app/dashboard/page.tsx` | ~130 | Report list |
| `apps/web/src/lib/auth.tsx` | ~120 | AuthProvider context |
| `apps/web/src/lib/api.ts` | ~20 | Axios client |
| `packages/infrastructure/src/storage/s3.service.ts` | ~114 | S3 upload, presigned URLs |
| `packages/infrastructure/src/ai/nvidia.service.ts` | ~120 | NVIDIA AI service (not used in worker due to caching) |
| `packages/infrastructure/src/ai/whisper.service.ts` | ~80 | Whisper transcription |
| `packages/infrastructure/src/pdf/pdf-generator.service.ts` | ~130 | PDF generation with PDFKit |
| `packages/shared/src/index.ts` | ~200 | Types, Zod schemas, enums |
| `prisma/schema.prisma` | ~120 | Full data model |
| `scripts/seed.ts` | ~150 | 3 industry templates |

### Comandos Útiles

```bash
# Desarrollo
npm run dev          # API + Web
npm run dev:worker   # Worker

# Build
npm run build        # Todo (tsc + next build)

# Base de datos
npx prisma db push   # Schema → DB (sin migraciones)
npx prisma migrate dev  # Con migraciones
npm run db:seed      # Seed templates

# Tests
npm test             # Jest

# Limpieza
npm run clean        # Borrar node_modules y dist
```

### Variables de Entorno (.env)

```
DATABASE_URL=postgresql://omnireport:omnireport_password@localhost:5432/omnireport
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
GOOGLE_API_KEY=...           # No usado actualmente (era Gemini)
OPENAI_API_KEY=...           # Whisper transcription
NVIDIA_API_KEY=nvapi-...     # AI principal (gemma-4-31b-it)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=omnireport-bucket
AWS_REGION=us-east-2
PORT=3000
NODE_ENV=development
```

### Seguridad Pendiente

- ⚠️ **Rotar NVIDIA_API_KEY** — Está expuesta en `.env.example`
- ⚠️ **Aplicar migración RLS** — `prisma/migrations/02_add_row_level_security.sql`
- ⚠️ **Implementar refresh token** — Frontend solo usa access token (expira en 15min)
- ⚠️ **Agregar rate limiting** — Sin protección contra abuso
- ⚠️ **Validar tamaño de archivos en API** — multer limita a 50MB pero falta validación de tipo