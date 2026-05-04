# OmniReport AI — Documento de Funcionalidades

> SaaS multi-tenant para generación automática de presupuestos de inspección técnica usando IA multimodal (imágenes + audio).

---

## Leyenda de Estado

| Símbolo | Significado |
|---------|-------------|
| ✅ | Funcional y operativo |
| ⚠️ | Parcialmente implementado o con limitaciones |
| ❌ | No implementado (planeado) |

---

## 1. Resumen General

OmniReport AI permite a usuarios subir fotos y audio de inspecciones técnicas, y receive un presupuesto completo generado por IA con hallazgos, severidad, costos estimados, resumen ejecutivo y acciones recomendadas. La aplicación soporta interacción conversacional con IA para modificar presupuestos en tiempo real.

### Stack Técnico

| Componente | Tecnología |
|------------|------------|
| Monorepo | npm workspaces + TypeScript project references |
| API | Express.js (`apps/api`) |
| Frontend | Next.js 15 App Router + React 19 (`apps/web`) |
| Worker | BullMQ + tsx (`apps/worker`) |
| Base de Datos | PostgreSQL 16 + Prisma ORM |
| Cache/Queue | Redis 7 |
| Almacenamiento | AWS S3 (us-east-2) |
| IA (análisis) | NVIDIA API → google/gemma-4-31b-it |
| IA (alternativa) | Google Gemini 1.5 Pro/Flash (no usado actualmente) |
| Transcripción | OpenAI Whisper API |
| PDF | PDFKit |
| Auth | JWT (15min access, 7d refresh) + bcrypt |
| Containerización | Docker Compose |
| UI | Tailwind CSS + shadcn/ui (base-nova) + lucide-react |

### Arquitectura

```
OmniReport/
├── apps/
│   ├── api/           # Express REST API
│   ├── web/            # Next.js frontend
│   └── worker/         # BullMQ AI processing worker
├── packages/
│   ├── domain/         # DDD entities + repository interfaces
│   ├── shared/         # Zod schemas, types, enums
│   ├── infrastructure/ # S3, AI, Whisper, JWT, PDF, Queue, Prisma repos
│   └── use-cases/      # GenerateReportUseCase, ProcessMediaUseCase
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── scripts/
    └── seed.ts        # 3 industry templates
```

### Flujo Principal

```
Usuario → Sube fotos/audio → API → BullMQ Queue
                                        ↓
                              Worker (BullMQ)
                              1. PROCCESSING
                              2. TRANSCRIBING (Whisper)
                              3. ANALYZING (NVIDIA AI)
                              4. COMPLETED (findings + costs)
                                        ↓
                              API ← Frontend polling
                              → PDF generation
                              → Chat AI modifications
```

---

## 2. Autenticación y Autorización

### Registro ✅

- `POST /api/v1/auth/register` — Crea usuario + organización automáticamente
- Campos: firstName, lastName, email, password, organizationName
- Genera slug automático desde el nombre de la organización
- Rol: ADMIN (el creador de la organización)
- Retorna: user + token pair (accessToken + refreshToken)

### Login ✅

- `POST /api/v1/auth/login` — Autenticación email/password
- Retorna: user + token pair

### Perfil ✅

- `GET /api/v1/auth/me` — Obtiene datos del usuario autenticado

### Token Refresh ✅

- `POST /api/v1/auth/refresh` — Renueva tokens usando refreshToken
- Frontend: interceptor Axios que detecta 401 y refresca automáticamente
- **Estado:** ✅ Backend funcional | ✅ Frontend implementado con interceptor Axios

### Middleware de Autenticación ✅

- `auth.middleware.ts` — Verifica Bearer token en header `Authorization`
- Popula `req.userId`, `req.orgId`, `req.email`, `req.role`
- Aplicado a todas las rutas `/api/v1/*` excepto `/health` y `/api/v1/auth`

### Multi-Tenancy ✅

- Todos los datos se filtran por `organizationId` extraído del JWT
- Organización se crea automáticamente con el registro
- Data scoping en repositorios: reports, clients, templates filtrados por org

### Control de Acceso por Roles ⚠️

- Roles definidos: `ADMIN` y `MEMBER`
- `requireRole()` implementado en `auth.middleware.ts` y aplicado en gestión de equipo
- ⚠️ RBAC granular no aplicado en todas las rutas sensibles (templates, clients DELETE, etc.)

### Seguridad Pendiente ⚠️

- ✅ **Rate limiting** — Implementado: auth (20/15min), general (200/min), creación (10/hora)
- ✅ **Row-Level Security** — Migración SQL aplicada. Funciones RLS conectadas en middleware de auth.
- ✅ **Validación de archivos** — Magic bytes, whitelist de extensiones, sanitización de nombres.

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/api/src/middleware/auth.middleware.ts` | Verificación JWT |
| `packages/infrastructure/src/auth/jwt.service.ts` | Generación/verificación de tokens |
| `packages/infrastructure/src/auth/password.service.ts` | Hash y verificación bcrypt |
| `apps/web/src/lib/auth.tsx` | AuthProvider + useAuth hook |

---

## 3. Gestión de Organización

### Obtener Organización ✅

- `GET /api/v1/organization` — Retorna datos de la org incluyendo lista de miembros

### Actualizar Organización ✅

- `PATCH /api/v1/organization` — Campos actualizables: name, address, phone, taxId, country, currency, language

### Subir Logo ✅

- `POST /api/v1/organization/logo` — Upload a S3 (max 5MB, multer)
- Se almacena en S3 y se actualiza `logoUrl` en la organización

### Planes ✅

| Plan | Reportes | Almacenamiento | Precio |
|------|----------|----------------|--------|
| FREE | 10 | 1 GB | Gratuito |
| PRO | 100 | 10 GB | — |
| ENTERPRISE | Ilimitados | 100 GB | — |

- Método `canCreateReport(reportCount)` en entidad `Organization` verifica límites
- ✅ **Verificación de límite implementada en `POST /reports`** — retorna 403 si se excede el plan

### Página Settings ✅

- Formulario completo para editar: nombre, dirección, teléfono, taxId, país, moneda, idioma, logo
- Ruta: `/settings`

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/api/src/routes/organization.routes.ts` | Endpoints CRUD |
| `packages/infrastructure/src/database/prisma-organization.repository.ts` | Repositorio DB |
| `packages/domain/src/entities/organization.entity.ts` | Entidad con reglas de negocio |
| `apps/web/src/app/settings/page.tsx` | Página de configuración |

---

## 4. Gestión de Clientes

### CRUD Completo ✅

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/clients` | Listar clientes de la organización |
| `POST` | `/api/v1/clients` | Crear cliente (name requerido; email, phone, address, taxId opcionales) |
| `PATCH` | `/api/v1/clients/:id` | Actualizar cliente |
| `DELETE` | `/api/v1/clients/:id` | Eliminar cliente (scoped por org) |

- Todos los endpoints son scoped por `organizationId` del JWT

### Página Clients ✅

- Tabla de clientes con nombre, email, teléfono, taxId
- Modal para crear/editar clientes
- Botón de eliminar
- Ruta: `/clients`
- Cliente vinculado a reporte (campo `clientId` en Report)

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/api/src/routes/clients.routes.ts` | Endpoints CRUD |
| `packages/infrastructure/src/database/prisma-client.repository.ts` | Repositorio DB |
| `apps/web/src/app/clients/page.tsx` | Página de gestión |

---

## 5. Gestión de Reportes / Presupuestos

### Ciclo de Vida ✅

```
PENDING → PROCESSING → TRANSCRIBING (si hay audio) → ANALYZING → COMPLETED
                ↓                                                       ↓
              FAILED                                                  DRAFT → APPROVED
```

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Reporte creado, esperando generación |
| `PROCESSING` | Worker inició procesamiento |
| `TRANSCRIBING` | Audio siendo transcrito por Whisper |
| `ANALYZING` | IA analizando imágenes + transcripción |
| `COMPLETED` | Generación completada exitosamente |
| `DRAFT` | Reporte editable después de completado |
| `APPROVED` | Reporte finalizado (no editable) |
| `FAILED` | Error en la generación |

### Endpoints ✅

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/reports` | Crear reporte (title, description, templateId, clientId, audioUrl, imageUrls, tags, language) |
| `GET` | `/api/v1/reports` | Listar reportes de la org (paginación: skip/take, filtro por status) |
| `GET` | `/api/v1/reports/:id` | Detalle del reporte con URLs firmadas S3 para imágenes/audio |
| `PATCH` | `/api/v1/reports/:id` | Edición parcial (title, description, findings, financials, severity, etc.). **No editable si APPROVED** |
| `DELETE` | `/api/v1/reports/:id` | Eliminar reporte + cleanup de archivos S3 |
| `POST` | `/api/v1/reports/:id/generate` | Encolar generación IA (BullMQ job) |
| `GET` | `/api/v1/reports/:id/pdf` | Descargar PDF generado |

### Creación Tradicional ✅

- Ruta: `/reports/new`
- Formulario con: título, descripción, selector de template, selector de cliente, selector de idioma, modo de input (mixed/images/audio/text), drag-and-drop de archivos (react-dropzone)
- Flujo: crear reporte → subir archivos → encolar generación

### Creación con IA (Chat) ✅

- Ruta: `/reports/new/chat`
- Primero pide título, crea el reporte, luego abre interfaz de chat completa
- Soporta: texto, grabación de voz (MediaRecorder API), upload de archivos (imágenes/audio/video)
- Usa endpoints `/api/v1/reports/:id/chat` y `/api/v1/reports/:id/chat/audio`
- Muestra sugerencias IA aplicables con un click

### Vista de Detalle ✅

- Ruta: `/reports/[id]`
- **Documento completo de presupuesto** con: header de org, info de cliente, resumen ejecutivo, tabla de findings con severidad y costos, resumen financiero (subtotal/IVA/total), condiciones de pago, acción recomendada
- **Edición inline:** Click en cualquier campo para editarlo (EditableField)
- **Panel de chat IA:** Slide-out con historial, texto y voz
- **Sistema de sugerencias:** La IA propone cambios que el usuario acepta o descarta
- **Polling:** Auto-refresh cada 3 segundos mientras status sea PENDING/PROCESSING/TRANSCRIBING/ANALYZING
- **Descarga PDF:** Botón para descargar el presupuesto en PDF
- **Gestión de estado:** Transición COMPLETED → DRAFT → APPROVED

### Datos Financieros del Reporte ✅

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `subtotal` | Float? | — | Suma de (estimatedCost × quantity) de cada finding |
| `taxRate` | Float? | 19 | Porcentaje de IVA/impuestos |
| `tax` | Float? | — | subtotal × taxRate / 100 |
| `total` | Float? | — | subtotal + tax |
| `currency` | String? | "CLP" | Moneda del presupuesto |
| `paymentTerms` | String? | — | Condiciones de pago |

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/api/src/routes/reports.routes.ts` | Endpoints CRUD + upload + generate + PDF |
| `packages/infrastructure/src/database/prisma-report.repository.ts` | Repositorio DB |
| `packages/domain/src/entities/report.entity.ts` | Entidad con lógica de estados |
| `apps/web/src/app/reports/new/page.tsx` | Formulario tradicional |
| `apps/web/src/app/reports/new/chat/page.tsx` | Creación vía chat IA |
| `apps/web/src/app/reports/[id]/page.tsx` | Vista detalle + edición inline + chat |

---

## 6. Subida de Medios

### Upload Directo ✅

- `POST /api/v1/reports/:id/upload` — Multipart form (multer)
- Máximo: 50MB por archivo, 10 archivos por request
- Tipos aceptados: imágenes (jpg, png, webp) y audio (mp3, m4a, wav, aac)
- Videos rechazados explícitamente
- Upload directo via API → S3 (no presigned PUT desde browser por CORS)

### Presigned URLs ✅

- `POST /api/v1/reports/upload-url` — Genera URL presignada de upload
- Lectura: `GET /api/v1/reports/:id` genera presigned URLs de descarga para images/audio
- Mapeo content-type → extensión: jpg, png, webp, mp3, m4a, wav, aac

### Almacenamiento S3 ✅

- Path: `orgs/{orgId}/reports/{reportId}/{type}/{timestamp}-{random}-{index}.{ext}`
- Región: us-east-2
- Bucket: configurable vía `AWS_S3_BUCKET`
- Cleanup automático al eliminar reporte (imágenes + audio)
- Upload de logo de organización también usa S3

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `packages/infrastructure/src/storage/s3.service.ts` | Operaciones S3 (presigned, upload, delete, metadata) |
| `packages/use-cases/src/process-media.use-case.ts` | Generación de URLs y mappings |
| `apps/api/src/routes/reports.routes.ts` | Endpoints de upload |

---

## 7. Pipeline de Generación con IA

### Worker BullMQ ✅

- Queue: `reports` (Redis-backed)
- Job: `generate-report` con `{ reportId }`
- Concurrency: 5 jobs simultáneos
- maxStalledCount: 0 (no retry automático de stalled)
- Exponential backoff en retries configurado

### Flujo del Worker ✅

1. **PROCESSING** — Actualiza estado, carga reporte desde DB
2. **Presigned URLs** — Genera URLs de descarga para imágenes/audio
3. **TRANSCRIBING** (si hay audio):
   - Mapea idioma del reporte (`es`/`en`/`pt`) a código Whisper
   - Descarga audio de S3, envía a OpenAI Whisper (`whisper-1`)
   - Limpia muletillas (um, uh, ah, like, you know, etc.)
   - Guarda transcripción en `audioTranscript`
4. **ANALYZING**:
   - Selecciona system prompt según idioma del reporte
   - Si existe `templateId`, carga template con prompt y formato custom
   - Convierte imágenes a base64
   - Envía a NVIDIA API (model: `google/gemma-4-31b-it`, temperature: 0.2, max_tokens: 16384)
   - Parsea respuesta JSON: findings[], executiveSummary, recommendedAction, estimatedTotalCost
5. **Cálculos Financieros**:
   - `subtotal = Σ(finding.estimatedCost × finding.quantity)`
   - `tax = subtotal × taxRate / 100` (default taxRate: 19%, IVA chileno)
   - `total = estimatedTotalCost || subtotal + tax`
6. **COMPLETED** — Persiste resultados: findings, summary, recommendedAction, aiModel, aiResponseTime, financials, completedAt
7. **FAILED** — En caso de error, marca como FAILED y re-lanza

### Modelo IA Principal ✅

- **NVIDIA API** → `google/gemma-4-31b-it`
- Temperature: 0.2
- Max tokens: 16384
- Input: transcript + imágenes (base64) + system prompt por idioma
- Output: JSON estructurado con findings, summary, recommended actions, cost estimates

### Modelo IA Alternativo (no activo) ⚠️

- **Google Gemini** → `gemini-1.5-pro` / `gemini-1.5-flash`
- Implementado en `packages/infrastructure/src/ai/gemini.service.ts`
- `GenerateReportUseCase` usa Gemini, pero el Worker actual usa NVIDIA
- ⚠️ **No se usa activamente** — `GeminiService` y `GenerateReportUseCase` son código muerto pendiente de eliminar o conectar

### Transcripción ✅

- **OpenAI Whisper** → `whisper-1`
- Soporta idiomas: español, inglés, portugués
- Limpieza de muletillas automática
- Retorna: texto, idioma detectado, duración

### Prompts por Idioma ✅

| Idioma | Código | Descripción |
|--------|--------|-------------|
| Español | `es` | Prompt orientado a presupuestos de inspección técnica |
| Inglés | `en` | Technical inspection budget prompt |
| Portugués | `pt` | Orçamento de inspeção técnica |

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/worker/src/index.ts` | Worker BullMQ, usa NvidiaService/WhisperService desde infraestructura |
| `packages/infrastructure/src/ai/nvidia.service.ts` | Servicio NVIDIA (no usado en worker por caching tsx) |
| `packages/infrastructure/src/ai/gemini.service.ts` | Servicio Gemini (no activo actualmente) |
| `packages/infrastructure/src/ai/whisper.service.ts` | Servicio de transcripción |
| `packages/use-cases/src/generate-report.use-case.ts` | Use case con Gemini (no usado actualmente) |

---

## 8. Sistema de Chat con IA

### Endpoints ✅

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/reports/:reportId/chat` | Historial de mensajes del reporte |
| `POST` | `/api/v1/reports/:reportId/chat` | Enviar mensaje de texto |
| `POST` | `/api/v1/reports/:reportId/chat/audio` | Enviar audio (se transcribe con Whisper y se envía a NVIDIA) |

### Modelo de Chat ✅

- **NVIDIA API** → `google/gemma-4-31b-it`
- Temperature: 0.3, max_tokens: 4096
- Contexto: últimos 20 mensajes + datos del reporte actual
- System prompt instruye al asistente como experto en presupuestos que puede modificar el reporte

### Bloques Estructurados ✅

La IA puede responder con bloques especiales además de texto libre:

| Bloque | Comportamiento |
|--------|----------------|
| `<<<MODIFY>>>` | Modificación automática del reporte (campos: title, description, findings, executiveSummary, recommendedAction, severity, subtotal, taxRate, tax, total, paymentTerms, currency) |
| `<<<SUGGEST>>>` | Sugerencia presentada al usuario para aceptar o rechazar |

### Chat por Audio ✅

- Grabación de voz en el navegador (MediaRecorder API)
- Upload de archivos de audio
- Audio se transcribe con Whisper → se envía a NVIDIA → respuesta con posibles modificaciones/sugerencias

### Chat en Frontend ✅

- Panel lateral deslizante en vista de reporte
- Historial de mensajes con scroll
- Input de texto + botón de grabación de voz
- Sugerencias IA mostradas como cards aceptables/rechazables
- Notificación de campo modificado con valor anterior y nuevo

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/api/src/routes/chat.routes.ts` | Endpoints de chat |
| `apps/web/src/app/reports/[id]/page.tsx` | UI de chat (aprox. 563 líneas) |
| `apps/web/src/app/reports/new/chat/page.tsx` | Chat para creación |

---

## 9. Sistema de Templates

### Modelo ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | String | Nombre del template |
| `description` | String? | Descripción |
| `industry` | Industry | AUTOMOTIVE, CONSTRUCTION, MANUFACTURING, INSURANCE, REAL_ESTATE, GENERAL |
| `systemPrompt` | String | Prompt del sistema para la IA |
| `outputFormat` | JSON | Schema de salida esperado |
| `isActive` | Boolean | Template activo/inactivo |
| `organizationId` | String? | null = global, específico = por org |

### Endpoint ✅

- `GET /api/v1/templates` — Lista templates activos (globales + de la organización)

### Templates Predefinidos ✅

| Template | Industria | Descripción |
|----------|-----------|-------------|
| Automotive Inspection | AUTOMOTIVE | Inspección vehicular con hallazgos y costos |
| Construction Inspection | CONSTRUCTION | Inspección de construcción/infraestructura |
| Manufacturing Audit | MANUFACTURING | Auditoría de manufactura |

### Limitaciones ⚠️

- ✅ El campo `templateId` se puede seleccionar en el formulario de creación (`/reports/new`)
- ❌ No existe UI para crear/editar templates custom
- ❌ No existe endpoint para crear templates (solo GET list)

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/api/src/routes/templates.routes.ts` | Endpoint de listado |
| `packages/domain/src/entities/template.entity.ts` | Entidad Template |
| `scripts/seed.ts` | Seed de 3 templates |

---

## 10. Generación de PDF

### Características ✅

- **Motor:** PDFKit
- **Formato:** A4 profesional en español
- **Título:** "PRESUPUESTO" (orientado a presupuesto/estimate)

### Secciones del PDF ✅

1. **Header** — Nombre de organización, tax ID, dirección, teléfono
2. **Banner** — "PRESUPUESTO" con número y fecha
3. **Identificación** — Número de reporte, título, fecha + datos del cliente (nombre, tax ID, email, teléfono)
4. **Resumen Ejecutivo** — Texto del executiveSummary
5. **Tabla de Items** — Columnas: #, Descripción, Cant., Precio Unit., Total. Con labels de severidad (Crítico/Alto/Medio/Bajo/Info). Paginación automática.
6. **Resumen de Costos** — Subtotal, IVA (tax), Total con símbolo de moneda
7. **Condiciones de Pago** — Campo paymentTerms
8. **Acción Recomendada** — Texto del recommendedAction
9. **Footer** — "Nombre Org — Powered by OmniReport AI" + Report ID

### Multi-Moneda ✅

| Moneda | Código | Decimales |
|--------|--------|-----------|
| Dólar US | USD | 2 |
| Euro | EUR | 2 |
| Libra | GBP | 2 |
| Peso Mexicano | MXN | 2 |
| Peso Colombiano | COP | 0 |
| Peso Argentino | ARS | 0 |
| Real Brasileño | BRL | 0 |
| Sol Peruano | PEN | 0 |
| Peso Chileno | CLP | 0 |

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `packages/infrastructure/src/pdf/pdf-generator.service.ts` | Generación PDF |

---

## 11. Frontend (App Web)

### Framework ✅

- **Next.js 15** App Router
- **React 19**
- **Tailwind CSS** + **shadcn/ui** (base-nova style)
- **lucide-react** icons
- **sonner** toasts
- **axios** HTTP client
- **react-dropzone** para upload
- **zod** validation

### Páginas ✅

| Ruta | Página | Estado |
|------|--------|--------|
| `/` | Landing page de marketing (logueados → `/dashboard`) | ✅ |
| `/login` | Login email + password | ✅ |
| `/register` | Registro con org, nombre, email, password | ✅ |
| `/dashboard` | Lista de reportes con badges estado/severidad, filtro por status | ✅ |
| `/clients` | CRUD de clientes con modal | ✅ |
| `/settings` | Configuración de organización + logo + equipo | ✅ |
| `/profile` | Edición de perfil y cambio de password | ✅ |
| `/reports/new` | Formulario tradicional de creación | ✅ |
| `/reports/new/chat` | Creación de presupuesto vía chat IA | ✅ |
| `/reports/[id]` | Detalle/editar + chat IA inline + vista previa PDF | ✅ |

### State Management ✅

- **React Context** — AuthProvider para estado de autenticación global
- **useState/useEffect** — Estado local en cada página
- **localStorage** — Persistencia de tokens (accessToken + refreshToken)
- **SSE** — `EventSource` para notificaciones push en tiempo real del estado del reporte (reemplaza polling)

### Componentes UI ✅

- **NavBar** — Navegación sticky con links a Presupuestos, Clientes, Configuración. CTAs: "Nuevo" y "Con IA". Responsivo con menú hamburguesa.
- **EditableField** — Click para editar inline (texto y números). Enter guarda, Escape cancela.
- **shadcn/ui** — Button, Card, Dialog, DropdownMenu, Input, Label, Select, Table, Tabs, Badge

### Formateo de Moneda ✅

- `formatCurrency()` — Formateo locale-aware con símbolo de moneda
- `getCurrencySymbol()` — Obtiene símbolo según código de moneda
- `formatNumberInput()` — Formateo de números para campos editables
- Manejo especial para monedas sin decimales (CLP, COP, ARS, BRL, PEN)

### Autenticación Frontend ✅

```
Registro → POST /auth/register → tokens → localStorage → Redirect /dashboard
Login    → POST /auth/login    → tokens → localStorage → Redirect /dashboard
Hydrate  → GET /auth/me        → user   → AuthContext  → Redirect /dashboard
Refresh  → 401 interceptor     → POST /auth/refresh → new tokens → retry
Logout   → clear localStorage → user = null → Redirect /login
```

### Internacionalización ✅

- ✅ Textos de UI en español, inglés y portugués
- ✅ Sistema `next-intl` implementado con archivos JSON por idioma
- ✅ Cambio de idioma persistente en `localStorage`
- ✅ Traducción completa en navbar, dashboard, settings, profile y landing page

### Archivos Clave

| Archivo | Rol |
|---------|-----|
| `apps/web/src/app/layout.tsx` | Root layout con AuthProvider + Toaster |
| `apps/web/src/lib/auth.tsx` | AuthProvider context + useAuth hook |
| `apps/web/src/lib/api.ts` | Axios instance + interceptor |
| `apps/web/src/lib/formatCurrency.ts` | Formateo de moneda |
| `apps/web/src/components/navbar.tsx` | Navbar responsivo |

---

## 12. Referencia Completa de API Endpoints

### Health ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | No | Info de API |
| `GET` | `/health` | No | Health check |

### Auth ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | No | Registro de usuario + organización |
| `POST` | `/api/v1/auth/login` | No | Login con email/password |
| `GET` | `/api/v1/auth/me` | Sí | Perfil del usuario autenticado |
| `PATCH` | `/api/v1/auth/me` | Sí | Actualizar perfil / cambiar password |
| `POST` | `/api/v1/auth/refresh` | No* | Refrescar token pair |

*Refresh requiere refreshToken válido en el body

### Reports ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/v1/reports` | Sí | Crear reporte |
| `GET` | `/api/v1/reports` | Sí | Listar reportes (skip, take, status, search, sortBy, sortOrder) |
| `GET` | `/api/v1/reports/stats` | Sí | Estadísticas del dashboard |
| `GET` | `/api/v1/reports/:id` | Sí | Detalle del reporte |
| `PATCH` | `/api/v1/reports/:id` | Sí | Actualizar parcialmente (no si APPROVED) |
| `DELETE` | `/api/v1/reports/:id` | Sí | Eliminar reporte + archivos S3 |
| `POST` | `/api/v1/reports/upload-url` | Sí | Generar presigned upload URL |
| `POST` | `/api/v1/reports/:id/upload` | Sí | Upload de archivos (multer, max 50MB, max 10) |
| `POST` | `/api/v1/reports/:id/generate` | Sí | Encolar generación IA |
| `GET` | `/api/v1/reports/:id/pdf` | Sí | Descargar o previsualizar PDF (?preview=true) |

### Chat ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/reports/:reportId/chat` | Sí | Historial de mensajes |
| `POST` | `/api/v1/reports/:reportId/chat` | Sí | Enviar mensaje de texto |
| `POST` | `/api/v1/reports/:reportId/chat/audio` | Sí | Enviar audio para chat |

### Organization ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/organization` | Sí | Datos de la organización |
| `PATCH` | `/api/v1/organization` | Sí | Actualizar organización |
| `POST` | `/api/v1/organization/logo` | Sí | Subir logo (max 5MB) |
| `GET` | `/api/v1/organization/members` | Sí | Listar miembros del equipo |
| `POST` | `/api/v1/organization/members/invite` | Sí | Invitar miembro (admin only) |
| `PATCH` | `/api/v1/organization/members/:id/role` | Sí | Cambiar rol de miembro (admin only) |
| `DELETE` | `/api/v1/organization/members/:id` | Sí | Desactivar miembro (admin only) |

### Clients ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/clients` | Sí | Listar clientes |
| `POST` | `/api/v1/clients` | Sí | Crear cliente |
| `PATCH` | `/api/v1/clients/:id` | Sí | Actualizar cliente |
| `DELETE` | `/api/v1/clients/:id` | Sí | Eliminar cliente |

### Templates ✅

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/templates` | Sí | Listar templates activos (globales + org) |

---

## 13. Modelo de Datos

### Entidades y Relaciones

```
Organization 1──N User
Organization 1──N Report
Organization 1──N Template
Organization 1──N Client

User 1──N Report

Template 1──N Report
Client 1──N Report

Report 1──N ChatMessage
```

### Organization ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre |
| slug | String | Slug único |
| logoUrl | String? | URL del logo en S3 |
| address | String? | Dirección |
| phone | String? | Teléfono |
| taxId | String? | RUC/CI/NIT |
| country | String? | País |
| currency | String | Moneda (default: USD) |
| language | String | Idioma (default: es) |
| plan | Plan | FREE / PRO / ENTERPRISE |
| maxReports | Int | Límite de reportes |
| maxStorage | BigInt | Límite de almacenamiento (bytes) |
| isActive | Boolean | Organización activa |

### User ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| email | String | Email único |
| passwordHash | String | Contraseña hasheada (bcrypt) |
| firstName | String | Nombre |
| lastName | String | Apellido |
| role | UserRole | ADMIN / MEMBER |
| isActive | Boolean | Usuario activo |
| organizationId | UUID | FK → Organization |

### Report ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| title | String | Título |
| description | String? | Descripción |
| status | ReportStatus | Estado del ciclo de vida |
| severity | Severity? | Severidad general |
| organizationId | UUID | FK → Organization |
| userId | UUID | FK → User |
| templateId | UUID? | FK → Template |
| clientId | UUID? | FK → Client |
| audioUrl | String? | URL del audio en S3 |
| audioTranscript | String? | Transcripción del audio |
| imageUrls | String[] | URLs de imágenes |
| findings | Json? | Array de findings con severidad, costo, cantidad |
| executiveSummary | String? | Resumen ejecutivo generado por IA |
| recommendedAction | String? | Acción recomendada |
| aiModel | String? | Modelo usado (e.g., google/gemma-4-31b-it) |
| aiResponseTime | Int? | Tiempo de respuesta en ms |
| subtotal | Float? | Subtotal calculado |
| taxRate | Float? | Tasa de impuesto (default 19%) |
| tax | Float? | Monto de impuesto |
| total | Float? | Total |
| currency | String? | Moneda (default CLP) |
| language | String? | Idioma del reporte |
| paymentTerms | String? | Condiciones de pago |
| metadata | Json? | Metadatos adicionales |
| tags | String[] | Tags |
| completedAt | DateTime? | Fecha de completado |

### Template ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre |
| description | String? | Descripción |
| industry | Industry | Industria |
| systemPrompt | String | Prompt del sistema para IA |
| outputFormat | Json | Schema de salida |
| isActive | Boolean | Activo |
| organizationId | UUID? | null = global |

### Client ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| name | String | Nombre |
| email | String? | Email |
| phone | String? | Teléfono |
| address | String? | Dirección |
| taxId | String? | Documento de identidad |
| organizationId | UUID | FK → Organization |

### ChatMessage ✅

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| reportId | UUID | FK → Report |
| role | String | user / assistant / system |
| content | String | Contenido del mensaje |
| createdAt | DateTime | Fecha de creación |

### Enums ✅

| Enum | Valores |
|------|---------|
| Plan | FREE, PRO, ENTERPRISE |
| UserRole | ADMIN, MEMBER |
| ReportStatus | PENDING, PROCESSING, TRANSCRIBING, ANALYZING, COMPLETED, DRAFT, APPROVED, FAILED |
| Severity | CRITICAL, HIGH, MEDIUM, LOW, INFO |
| Industry | GENERAL, AUTOMOTIVE, CONSTRUCTION, MANUFACTURING, INSURANCE, REAL_ESTATE |

---

## 14. Infraestructura y Despliegue

### Docker Compose ✅

| Servicio | Imagen | Puerto | Descripción |
|----------|--------|--------|-------------|
| postgres | postgres:16-alpine | 5432 | Base de datos principal |
| redis | redis:7-alpine | 6379 | Cache + BullMQ queue |
| api | custom (api.Dockerfile) | 3000 | Express API |
| web | custom (web.Dockerfile) | 3001 | Next.js frontend |

### Servicios Externos ✅

| Servicio | Uso | Configuración |
|----------|-----|---------------|
| AWS S3 | Almacenamiento de archivos (imágenes, audio, logos) | Region us-east-2 |
| OpenAI Whisper | Transcripción de audio | Model whisper-1 |
| NVIDIA API | Análisis multimodal (texto + imágenes) | Model google/gemma-4-31b-it |
| Google Gemini | Análisis alternativo (no activo) | Model gemini-1.5-pro/flash |

### Base de Datos ✅

- PostgreSQL 16 via Prisma ORM
- Migraciones en `prisma/migrations/`
- Seed: `npm run db:seed` (3 templates de industria)
- Conexión: `DATABASE_URL` en `.env`

### Comandos ✅

```bash
# Desarrollo
npm run dev              # API + Web
npm run dev:api          # Solo API
npm run dev:web          # Solo Web
npm run dev:worker       # Worker

# Build
npm run build            # Todo (tsc + next build)
npm run build:api        # Solo API
npm run build:worker     # Solo Worker
npm run build:web        # Solo Web

# Base de datos
npx prisma db push       # Schema → DB (sin migraciones)
npx prisma migrate dev   # Con migraciones
npm run db:seed          # Seed templates

# Tests
npm test                 # Jest
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage

# Limpieza
npm run clean            # Borrar node_modules y dist
```

---

## 15. Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://omnireport:omnireport_password@localhost:5432/omnireport` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Clave para firmar JWT | Requerido |
| `PORT` | Puerto de la API | `3000` |
| `NODE_ENV` | Entorno | `development` |
| `AWS_REGION` | Región S3 | `us-east-2` |
| `AWS_S3_BUCKET` | Nombre del bucket S3 | Requerido |
| `AWS_ACCESS_KEY_ID` | Credencial AWS | Requerido |
| `AWS_SECRET_ACCESS_KEY` | Credencial AWS | Requerido |
| `OPENAI_API_KEY` | Clave OpenAI (Whisper) | Requerido |
| `NVIDIA_API_KEY` | Clave NVIDIA (análisis IA) | Requerido |
| `GOOGLE_API_KEY` | Clave Google (Gemini, no activo) | Opcional |
| `NEXT_PUBLIC_API_URL` | URL de la API para el frontend | `http://localhost:3000` |
| `API_PROXY_URL` | URL de la API para proxy Next.js | `http://api:3000` |

---

## 16. Funcionalidades Planeadas (Roadmap)

### FASE 1 — Presupuesto Real

| # | Feature | Estado | Descripción |
|---|---------|--------|-------------|
| 1.1 | Configuración del negocio | ✅ | Campos de org (dirección, teléfono, taxId, moneda, idioma) + logo upload |
| 1.2 | Modelo de cliente | ✅ | CRUD de clients con vinculación a reportes |
| 1.3 | Precios y costos | ✅ | Findings con estimatedCost + quantity, subtotal/tax/total en reporte |
| 1.4 | Multi-idioma | ✅ | `next-intl` implementado con es/en/pt en UI, landing y worker |

### FASE 2 — Interactividad

| # | Feature | Estado | Descripción |
|---|---------|--------|-------------|
| 2.1 | Estado DRAFT y edición | ✅ | Reportes editables (DRAFT), bloqueados (APPROVED), edición inline |
| 2.2 | Chat IA conversacional | ✅ | Chat con texto/audio, MODIFY/SUGGEST blocks, historial persistido |
| 2.3 | Template selection en UI | ✅ | Selector de template funciona en `/reports/new` y `/reports/new/chat` |

### FASE 3 — UI/UX Profesional

| # | Feature | Estado | Descripción |
|---|---------|--------|-------------|
| 3.1 | Dashboard mejorado | ✅ | KPIs, búsqueda, filtros, ordenamiento, paginación |
| 3.2 | Gestión de equipo | ✅ | Tab Equipo en settings: miembros, invitaciones, roles |
| 3.3 | Vista previa PDF | ✅ | Modal con iframe (?preview=true) + descarga |
| 3.4 | Notificaciones | ✅ | Toast in-app cuando reporte termina/falla. Falta email y WebSocket/SSE |
| 3.5 | Perfil de usuario | ✅ | Página /profile con edición y cambio de password |
| 3.6 | Rate limiting | ✅ | Por IP: auth (20/15min), general (200/min), creación (10/hora) |

### Resumen de Estado por Fase

| Fase | Progreso | Notas |
|------|-----------|-------|
| FASE 1 | ~95% | Funcionalidades core implementadas, i18n completo |
| FASE 2 | ~95% | Chat IA completo, edición inline funciona, template selection en UI |
| FASE 3 | ~95% | Dashboard profesional, equipo, preview PDF, perfil, notificaciones in-app, i18n, SSE, landing page listos |

---

## 17. Problemas Conocidos y Limitaciones

### Críticos ⚠️

| # | Problema | Impacto | Archivo |
|---|----------|---------|---------|
| 1 | API key NVIDIA expuesta en `.env.example` | ✅ Resuelto: placeholders agregados, rotar keys en servicios | `.env.example` |
| 2 | RLS no aplicado | ✅ Resuelto: migración ejecutada y conectada en middleware | `prisma/migrations/` |
| 3 | tsx watch cachea módulos | ✅ Resuelto: worker refactorizado para usar servicios de infraestructura | `apps/worker/src/index.ts` |

### Funcionales ⚠️

| # | Problema | Impacto |
|---|----------|---------|
| 4 | Sin selector de template en UI | ✅ Resuelto: selector funciona en `/reports/new` y `/reports/new/chat` |
| 5 | Worker usa NVIDIA inline | ✅ Resuelto: worker usa `NvidiaService` desde infraestructura |
| 6 | `GenerateReportUseCase` (Gemini) no se usa | Código muerto pendiente de eliminar o conectar |

### UX ⚠️

| # | Problema | Impacto |
|---|----------|---------|
| 7 | Dashboard básico | ✅ Resuelto: KPIs, búsqueda, filtros, ordenamiento, paginación |
| 8 | Sin vista previa PDF | ✅ Resuelto: Modal con iframe (?preview=true) |
| 9 | Polling cada 3s | ✅ Resuelto: reemplazado por SSE (`/reports/:id/events`) |
| 10 | UI sin i18n formal | ✅ Resuelto: next-intl con es/en/pt implementado |

### Seguridad ⚠️

| # | Problema | Impacto |
|---|----------|---------|
| 11 | Sin rate limiting | ✅ Resuelto: por IP, auth, general y creación de reportes |
| 12 | Validación de archivos básica | ✅ Resuelto: magic bytes, whitelist extensiones, sanitización |
| 13 | RBAC no implementado | ⚠️ `requireRole()` existe y se usa en gestión de equipo. Falta aplicar en más rutas sensibles |