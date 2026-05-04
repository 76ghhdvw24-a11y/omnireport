# OmniReport AI — Estado del Proyecto y Roadmap

## Resumen

OmniReport AI es una aplicación SaaS multi-tenant para generación automática de reportes de inspección usando IA multimodal (imágenes + audio). Los usuarios suben fotos/audio, la IA analiza y genera un reporte con hallazgos, severidad, resumen ejecutivo y acciones recomendadas.

---

## Estado Actual (Mayo 2026)

### Funcionalidad Operativa

| Feature | Estado | Notas |
|---------|--------|-------|
| Registro/Login | ✅ Funcional | JWT access + refresh tokens, BCrypt password, interceptor en frontend |
| Multi-tenant (Organización) | ✅ Funcional | Organización creada con registro, `orgId` en middleware, RLS aplicado |
| Crear reporte | ✅ Funcional | Título + descripción + template + cliente + idioma + subida de archivos |
| Subida de imágenes/audio | ✅ Funcional | Proxy por API (multer → S3), validación estricta de archivos |
| URLs firmadas S3 | ✅ Funcional | Presigned URLs para lectura de imágenes |
| Transcripción de audio | ✅ Funcional | OpenAI Whisper multi-idioma (`es`, `en`, `pt`) |
| Análisis con IA | ✅ Funcional | NVIDIA API → `google/gemma-4-31b-it` |
| Generación de PDF | ✅ Funcional | PDFKit profesional con branding, multi-moneda |
| Dashboard | ✅ Funcional | KPIs, búsqueda, filtros, ordenamiento, paginación real |
| Templates por industria | ✅ Funcional | 3 templates en DB + selector en UI de creación |
| Eliminación de reportes | ✅ Funcional | Con cleanup de archivos S3 |
| Chat IA conversacional | ✅ Funcional | MODIFY/SUGGEST blocks, historial persistido, chat por audio |
| Landing page | ✅ Funcional | Marketing en `/` con redirección inteligente |
| RabbitMQ/BullMQ worker | ✅ Funcional | Concurrency: 5, Redis-backed, usa servicios de infraestructura |

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
| Auth | JWT (15min access, 7d refresh — refresh implementado con interceptor en frontend) |
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
- Landing page: `/` (logueados redirigen a `/dashboard`)

---

## Problemas Conocidos y Limitaciones

### Críticos (anteriores, ahora resueltos)

1. ✅ **NVIDIA_API_KEY expuesta** — `.env.example` limpiado. Rotar keys reales en servicios.
2. ✅ **Row Level Security aplicado** — Migración `02_add_row_level_security.sql` ejecutada y conectada en middleware.
3. ✅ **tsx watch cachea módulos** — Worker refactorizado para usar `NvidiaService`, `WhisperService` desde `packages/infrastructure`.

### Funcionales (anteriores, ahora resueltos)

4. ✅ **Multi-idioma implementado** — UI, landing, worker y Whisper soportan `es`, `en`, `pt`.
5. ✅ **Modelo Cliente implementado** — CRUD completo con vinculación a reportes.
6. ✅ **Datos del negocio implementados** — Dirección, teléfono, taxId, país, moneda, idioma en `Organization`.
7. ✅ **Precios/costos implementados** — `Finding.estimatedCost` + quantity, subtotal/tax/total en reporte.
8. ✅ **Selección de template en UI** — Selector funciona en `/reports/new` y `/reports/new/chat`.
9. ✅ **Edición posterior implementada** — Estados `DRAFT` (editable) y `APPROVED` (bloqueado), edición inline.
10. ✅ **Refresh token en frontend** — Interceptor Axios detecta 401 y refresca automáticamente.

### UX (anteriores, ahora resueltos)

11. ✅ **Dashboard profesional** — KPIs, filtros, búsqueda, paginación real, ordenamiento.
12. ✅ **Gestión de organización** — Settings con tabs: General, Branding (logo upload), Equipo, Plan.
13. ✅ **Gestión de usuario** — Perfil (`/profile`), cambio de password, roles ADMIN/MEMBER.
14. ✅ **PDF personalizado** — Incluye logo, datos de empresa, cliente, formato de presupuesto.
15. ✅ **Vista previa de PDF** — Modal con iframe (`?preview=true`) + descarga directa.

### Pendientes actuales

| # | Problema | Impacto | Estado |
|---|----------|---------|--------|
| 16 | Sin testing automatizado | Alto — regresiones no detectadas | ⬜ 0% cobertura |
| 17 | Código duplicado en rutas | Medio — chat.routes usa Prisma directo | ⚠️ Parcial |
| 18 | Type casts `as any` | Medio — tipos de shared desactualizados | ⚠️ Parcial |
| 19 | Sin logging estructurado | Medio — solo console.log/morgan | ⬜ |
| 20 | Sin notificaciones email | Bajo — solo toast in-app | ⬜ |
| 21 | Sin monitoreo/métricas | Bajo — sin Prometheus/healthchecks avanzados | ⬜ |
| 22 | Sin revocación de refresh tokens | Medio — tokens no se pueden invalidar | ⬜ |
| 23 | Flujo de migraciones con `db push` | Medio — riesgo en producción | ⬜ |

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

## Roadmap Completado ✅

Las siguientes fases fueron implementadas entre abril y mayo de 2026.

### FASE 1 — Convertir en Presupuesto Real ✅

- ✅ **1.1 Configuración del Negocio** — Campos agregados a `Organization` (address, phone, taxId, currency, language, country). API de CRUD + logo upload. Settings con tabs.
- ✅ **1.2 Modelo de Cliente** — Entidad `Client` creada con CRUD completo. Selector en formulario de reporte + página `/clients`.
- ✅ **1.3 Precios y Costos** — AI prompt incluye `estimatedCost` y `quantity`. Reporte calcula subtotal, tax, total. Edición inline en UI.
- ✅ **1.4 Soporte Multi-Idioma** — `next-intl` con `es`, `en`, `pt`. Whisper recibe idioma dinámico. PDFs generados en idioma del reporte.

### FASE 2 — Interactividad ✅

- ✅ **2.1 Estado DRAFT y Edición** — `DRAFT` y `APPROVED` en `ReportStatus`. Edición inline completa (`/reports/[id]`). Botón "Aprobar".
- ✅ **2.2 AI Agent Conversacional** — Chat persistido (`ChatMessage`). Bloques `<<<MODIFY>>>` y `<<<SUGGEST>>>`. Chat por audio (Whisper → NVIDIA).
- ✅ **2.3 Template Selection en UI** — Dropdown en `/reports/new` y `/reports/new/chat`. Carga desde `/api/v1/templates`.

### FASE 3 — UI/UX Profesional ✅

- ✅ **3.1 Dashboard Mejorado** — 4 KPI cards, filtros, búsqueda, paginación real, ordenamiento.
- ✅ **3.2 Gestión de Organización** — Settings con tabs: General, Branding (logo upload a S3), Equipo (invitar, roles, desactivar), Plan.
- ✅ **3.3 Vista Previa de PDF** — Modal con iframe (`?preview=true`). Descarga directa.
- ✅ **3.4 Notificaciones** — Toast in-app vía SSE (`/reports/:id/events`). Reemplaza polling cada 3s.
- ✅ **3.5 Landing Page** — `/` con Hero, Cómo funciona, Features, Pricing, CTA, Footer. Redirección inteligente.

---

## Roadmap Futuro (Próximas Fases)

### FASE 4 — Testing y Calidad de Código

Prioridad: Alta — sin tests, el proyecto no es mantenible a largo plazo.

- **T1 — Tests de integración API** — supertest + Jest para auth, reports, clients, templates, organization, chat.
- **T2 — Tests del worker** — Unitarios con mocks para NVIDIA, Whisper, S3.
- **T3 — Tests de servicios de infraestructura** — PDF, Queue, S3 operaciones completas.
- **T4 — Tests del frontend** — React Testing Library para Dashboard, EditableField, ChatPanel.
- **T5 — Tests E2E** — Playwright para flujo completo: registro → login → crear reporte → chat → aprobar.
- **A3 — Repository pattern en todas las rutas** — Migrar auth, org, clients, templates a usar repositorios del dominio.
- **A5 — Eliminar type casts `as any`** — Sincronizar `@omnireport/shared` con schema Prisma.
- **C3 — Manejo de errores consistente** — Usar `AppError` (ya existe en `middleware/errors.ts`) en todas las rutas.

### FASE 5 — Infraestructura de Producción

Prioridad: Media — necesario antes de escalar usuarios.

- **I3 — Sistema de migraciones real** — Migrar de `prisma db push` a `prisma migrate dev`.
- **I4 — Logging estructurado** — `pino` o `winston` con JSON, contexto (`orgId`, `reportId`, `jobId`).
- **I5 — Monitoreo y métricas** — Endpoint `/metrics` (Prometheus) para API, worker, S3.
- **F8 — Notificaciones email** — SendGrid/Resend para notificar cuando un reporte se completa o falla.
- **S9 — Revocación de refresh tokens** — Tabla o blacklist en Redis para tokens revocados.
- **C4 — Validación de env vars** — Schema Zod para fallar rápido si falta una variable.
- **A4 — Eliminar código muerto** — Decidir si eliminar o conectar `GeminiService`, `GenerateReportUseCase`, `PrismaOrganizationRepository`, etc.

---

## APIs Implementados (Referencia Completa)

### Auth
| Method | Path | Estado |
|--------|------|--------|
| `POST` | `/api/v1/auth/register` | ✅ |
| `POST` | `/api/v1/auth/login` | ✅ |
| `GET` | `/api/v1/auth/me` | ✅ |
| `PATCH` | `/api/v1/auth/me` | ✅ |
| `POST` | `/api/v1/auth/refresh` | ✅ |

### Organization
| Method | Path | Estado |
|--------|------|--------|
| `GET` | `/api/v1/organization` | ✅ |
| `PATCH` | `/api/v1/organization` | ✅ |
| `POST` | `/api/v1/organization/logo` | ✅ |
| `GET` | `/api/v1/organization/members` | ✅ |
| `POST` | `/api/v1/organization/members/invite` | ✅ |
| `PATCH` | `/api/v1/organization/members/:id/role` | ✅ |
| `DELETE` | `/api/v1/organization/members/:id` | ✅ |

### Clients
| Method | Path | Estado |
|--------|------|--------|
| `GET` | `/api/v1/clients` | ✅ |
| `POST` | `/api/v1/clients` | ✅ |
| `PATCH` | `/api/v1/clients/:id` | ✅ |
| `DELETE` | `/api/v1/clients/:id` | ✅ |

### Templates
| Method | Path | Estado |
|--------|------|--------|
| `GET` | `/api/v1/templates` | ✅ |

### Reports
| Method | Path | Estado |
|--------|------|--------|
| `POST` | `/api/v1/reports` | ✅ |
| `GET` | `/api/v1/reports` | ✅ |
| `GET` | `/api/v1/reports/stats` | ✅ |
| `GET` | `/api/v1/reports/:id` | ✅ |
| `PATCH` | `/api/v1/reports/:id` | ✅ |
| `DELETE` | `/api/v1/reports/:id` | ✅ |
| `POST` | `/api/v1/reports/upload-url` | ✅ |
| `POST` | `/api/v1/reports/:id/upload` | ✅ |
| `POST` | `/api/v1/reports/:id/generate` | ✅ |
| `GET` | `/api/v1/reports/:id/pdf` | ✅ |
| `GET` | `/api/v1/reports/:id/events` | ✅ SSE |

### Chat
| Method | Path | Estado |
|--------|------|--------|
| `GET` | `/api/v1/reports/:reportId/chat` | ✅ |
| `POST` | `/api/v1/reports/:reportId/chat` | ✅ |
| `POST` | `/api/v1/reports/:reportId/chat/audio` | ✅ |

---

## Modelo de Datos Actual (Implementado)

```prisma
model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  address     String?
  phone       String?
  taxId       String?
  country     String?
  currency    String   @default("USD")
  language    String   @default("es")
  plan        Plan     @default(FREE)
  maxReports  Int      @default(10)
  maxStorage  BigInt   @default(1073741824)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
  reports     Report[]
  templates   Template[]
  clients     Client[]
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

model Report {
  id                String       @id @default(uuid())
  title             String
  description       String?
  status            ReportStatus @default(PENDING)
  severity          Severity?
  organizationId    String
  userId            String
  templateId        String?
  clientId          String?
  audioUrl          String?
  audioTranscript   String?
  imageUrls         String[]
  findings          Json?
  executiveSummary  String?
  recommendedAction String?
  aiModel           String?
  aiResponseTime    Int?
  subtotal          Float?
  taxRate           Float?       @default(19)
  tax               Float?
  total             Float?
  currency          String?      @default("CLP")
  language          String?
  paymentTerms      String?
  metadata          Json?
  tags              String[]
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  completedAt       DateTime?
  organization      Organization @relation(fields: [organizationId], references: [id])
  user              User         @relation(fields: [userId], references: [id])
  template          Template?    @relation(fields: [templateId], references: [id])
  client            Client?      @relation(fields: [clientId], references: [id])
  chatMessages      ChatMessage[]
}

model ChatMessage {
  id         String   @id @default(uuid())
  reportId   String
  role       String
  content    String
  createdAt  DateTime @default(now())
  report     Report   @relation(fields: [reportId], references: [id])
}

model Template {
  id             String   @id @default(uuid())
  name           String
  description    String?
  industry       Industry @default(GENERAL)
  systemPrompt   String
  outputFormat   Json
  isActive       Boolean  @default(true)
  organizationId String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

enum Plan        { FREE PRO ENTERPRISE }
enum UserRole    { ADMIN MEMBER }
enum ReportStatus { PENDING PROCESSING TRANSCRIBING ANALYZING COMPLETED DRAFT APPROVED FAILED }
enum Severity    { CRITICAL HIGH MEDIUM LOW INFO }
enum Industry    { GENERAL AUTOMOTIVE CONSTRUCTION MANUFACTURING INSURANCE REAL_ESTATE }
```

---

## Notas Técnicas para el Agente

### tsx Watch Caching Issue (Workaround aplicado)
`tsx watch` no detecta cambios en `packages/infrastructure` ni `packages/use-cases`. La solución aplicada fue refactorizar el worker para importar servicios desde `packages/infrastructure` en lugar de tener lógica inline. Para desarrollo local:
- Restart manual del worker tras cambios en `packages/`
- Alternativa: compilar el worker a JS puro (`npm run build:worker`) y ejecutar con `node dist/index.js`

### S3 Region
El bucket está en `us-east-2`, no `us-east-1`. Todos los defaults deben ser `us-east-2`.

### Upload Flow
El flujo actual es: Frontend → `POST /api/v1/reports/:id/upload` (multipart) → API sube a S3. NO usar presigned PUT directo desde el browser (CORS issues).

### Presigned URLs para Lectura
`GET /api/v1/reports/:id` genera presigned URLs para images/audio. Los usuarios no acceden directamente a S3.

### Worker Inlining (Resuelto)
✅ La lógica de NVIDIA AI fue movida a `NvidiaService` en `packages/infrastructure/src/ai/nvidia.service.ts`. El worker (`apps/worker/src/index.ts`) ahora importa y usa `NvidiaService`, `WhisperService` y `PrismaReportRepository` desde los paquetes de infraestructura. El código inline fue eliminado.

### Quantum del Código por Archivo Clave

| Archivo | Líneas | Rol |
|---------|--------|-----|
| `apps/api/src/routes/reports.routes.ts` | ~300 | CRUD + upload + generate + PDF |
| `apps/api/src/routes/auth.routes.ts` | ~120 | Register + login + me |
| `apps/api/src/index.ts` | ~90 | Express setup, middleware, route mounting |
| `apps/api/src/middleware/auth.middleware.ts` | ~40 | JWT verification, req.userId/orgId |
| `apps/worker/src/index.ts` | ~220 | BullMQ worker, uses NvidiaService/WhisperService from infrastructure |
| `apps/web/src/app/reports/new/page.tsx` | ~185 | Upload form with dropzone |
| `apps/web/src/app/reports/[id]/page.tsx` | ~280 | Report detail with SSE + chat AI + inline editing |
| `apps/web/src/app/dashboard/page.tsx` | ~130 | Report list |
| `apps/web/src/lib/auth.tsx` | ~120 | AuthProvider context |
| `apps/web/src/lib/api.ts` | ~20 | Axios client |
| `packages/infrastructure/src/storage/s3.service.ts` | ~114 | S3 upload, presigned URLs |
| `packages/infrastructure/src/ai/nvidia.service.ts` | ~120 | NVIDIA AI service (used by worker and chat routes) |
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

### Seguridad Implementada

- ✅ **Rotar NVIDIA_API_KEY** — `.env.example` limpiado, rotar keys reales en servicios
- ✅ **Aplicar migración RLS** — Ejecutada y conectada en middleware
- ✅ **Implementar refresh token** — Frontend con interceptor Axios automático
- ✅ **Agregar rate limiting** — Auth (20/15min), general (200/min), creación (10/hora)
- ✅ **Validar archivos en API** — Magic bytes, whitelist extensiones, sanitización

### Pendientes Críticos

- ⬜ **Testing** — 0 tests de integración, 0 tests del worker, 0 tests E2E
- ⬜ **Revocación de refresh tokens** — No hay mecanismo para invalidar tokens
- ⬜ **Logging estructurado** — Solo `morgan` y `console.log`
- ⬜ **Migraciones formales** — Aún se usa `prisma db push`