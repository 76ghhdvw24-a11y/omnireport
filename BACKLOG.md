# OmniReport AI — Backlog de Tareas

> Última actualización: 2026-05-04

## Leyenda

| Icono | Significado |
|-------|-------------|
| 🔴 | Crítico / Bloqueador |
| 🟡 | Importante / Alta prioridad |
| 🟢 | Mejora / Media prioridad |
| 🔵 | Nice-to-have / Baja prioridad |
| ⬜ | Pendiente |
| 🔄 | En progreso |
| ✅ | Completado |

---

## SEGURIDAD

### 🔴 S1 — Rotar API keys expuestas
- **Estado:** ✅ (2026-05-03)
- **Detalle:** `.env.example` limpiado, placeholders agregados. **IMPORTANTE:** Las keys reales en `.env` deben rotarse manualmente en los servicios.
- **Archivos:** `.env.example`

### 🔴 S2 — Aplicar Row-Level Security
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Migración actualizada para incluir Client y ChatMessage. Funciones RLS conectadas en middleware de auth.
- **Archivos:** `prisma/migrations/02_add_row_level_security.sql`, `packages/infrastructure/src/database/connection.ts`, `apps/api/src/middleware/auth.middleware.ts`

### 🟡 S3 — Agregar rate limiting
- **Estado:** ✅ (2026-05-03)
- **Detalle:** `express-rate-limit` instalado. Límites: auth (20 req/15min), general (100 req/min), report creation (10 req/hora).
- **Archivos:** `apps/api/src/index.ts`, `package.json`

### 🟡 S4 — Implementar RBAC en middleware de rutas
- **Estado:** ✅ (2026-05-03)
- **Detalle:** `requireRole()` creado en `auth.middleware.ts`. Pendiente aplicar en rutas sensibles (templates DELETE, clients DELETE, etc.).
- **Archivos:** `apps/api/src/middleware/auth.middleware.ts`, rutas API

### 🟢 S10 — CORS configurable para producción
- **Estado:** ✅ (2026-05-03)
- **Detalle:** CORS ya lee `CORS_ORIGINS` desde env var con fallback a `localhost:3000,localhost:3001`. Verificado en `apps/api/src/index.ts`.
- **Archivos:** `apps/api/src/index.ts`

### 🟡 S5 — Validación estricta de archivos subidos
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Middleware `file-validator.ts` creado. Valida magic bytes, whitelist de extensiones, sanitización de nombres. Integrado en upload route.
- **Archivos:** `apps/api/src/middleware/file-validator.ts`, `apps/api/src/routes/reports.routes.ts`

### 🟡 S6 — Validación Zod en todas las rutas
- **Estado:** ✅ (2026-05-03)
- **Detalle:** `chatMessageSchema` agregado en chat.routes. `updateReportSchema` creado y aplicado en PATCH /:id. `createReportSchema` ya existía. Todas las rutas ahora validan input con Zod.
- **Archivos:** `apps/api/src/routes/chat.routes.ts`, `apps/api/src/routes/reports.routes.ts`

### 🟡 S7 — Verificar límite de reportes antes de crear
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Verificación de límite de plan agregada en `reports.routes.ts`. Retorna 403 con detalles si se excede.
- **Archivos:** `apps/api/src/routes/reports.routes.ts`

### 🟢 S8 — JWT secret robusto por defecto
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Validación agregada en `index.ts`. En producción, si JWT_SECRET es un valor por defecto, la app termina con error. En desarrollo muestra warning.
- **Archivos:** `apps/api/src/index.ts`

### 🟢 S9 — Revocación de refresh tokens
- **Estado:** ✅ (2026-05-04)
- **Detalle:** `TokenBlacklistService` implementado con Redis. Verifica tokens revocados en auth middleware y en refresh. Endpoint `POST /api/v1/auth/logout` revoca access + refresh tokens con TTL.
- **Archivos:** `packages/infrastructure/src/auth/token-blacklist.service.ts`, `apps/api/src/middleware/auth.middleware.ts`, `apps/api/src/routes/auth.routes.ts`



---

## ARQUITECTURA / REFACTORIZACIÓN

### 🟡 A1 — Refactorizar worker para usar servicios de infraestructura
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Worker refactorizado para usar `NvidiaService`, `WhisperService` y `PrismaReportRepository` del paquete de infraestructura. Eliminado código inline duplicado.
- **Archivos:** `apps/worker/src/index.ts`, `packages/infrastructure/src/ai/nvidia.service.ts`

### 🟡 A2 — Refactorizar chat routes para usar servicios de infraestructura
- **Estado:** ✅ (2026-05-03)
- **Detalle:** `chat.routes.ts` ahora importa `S3Service`, `NvidiaService` y `WhisperService` desde `@omnireport/infrastructure`. Eliminado código inline duplicado.
- **Archivos:** `apps/api/src/routes/chat.routes.ts`

### 🟡 A3 — Aplicar repository pattern en todas las rutas
- **Estado:** ✅ (2026-05-04) — Parcial
- **Detalle:** `auth.routes.ts` ahora usa `PrismaOrganizationRepository` y `PrismaUserRepository`. `clients.routes.ts` y `templates.routes.ts` ya usaban repositorios. `organization.routes.ts` ya usa `PrismaOrganizationRepository`. Falta: `chat.routes.ts` (usa Prisma directo).
- **Archivos:** `apps/api/src/routes/auth.routes.ts`

### 🟡 A4 — Eliminar código muerto o conectar servicios existentes
- **Estado:** ⬜
- **Detalle:** ~500 líneas de código no usado: `GeminiService`, `NvidiaService` (infra), `PrismaOrganizationRepository`, `PrismaClientRepository`, `PrismaUserRepository`, `GenerateReportUseCase`. Decidir si conectarlos o eliminarlos.
- **Archivos:** `packages/infrastructure/src/`, `packages/use-cases/src/`

### 🟡 A5 — Eliminar type casts `as any` en repositorios
- **Estado:** ⬜
- **Detalle:** `PrismaReportRepository` y `WorkerReportRepository` usan `as any` porque los tipos de `@omnireport/shared` no incluyen campos como `clientId`, `subtotal`, `taxRate`, `tax`, `total`, `currency`, `language`, `paymentTerms`. Actualizar los tipos para que coincidan con el schema de Prisma.
- **Archivos:** `packages/shared/src/types/report.types.ts`, `packages/infrastructure/src/database/prisma-report.repository.ts`, `apps/worker/src/index.ts`

### 🟢 A6 — Agregar interfaces de repositorio faltantes al dominio
- **Estado:** ⬜
- **Detalle:** No existen interfaces para: `UserRepository`, `OrganizationRepository`, `ClientRepository`, `TemplateRepository`, `ChatMessageRepository`. Solo existe `ReportRepository`. Agregar contratos en `packages/domain/src/repositories/`.
- **Archivos:** `packages/domain/src/repositories/`

### 🟢 A7 — Consistencia de default de moneda
- **Estado:** ⬜
- **Detalle:** El schema Prisma usa `CLP` como default, la documentación dice `USD`, y la UI tiene texto en español. Unificar el default a `CLP` (mercado chileno) o hacerlo configurable.
- **Archivos:** `prisma/schema.prisma`, `packages/shared/`, PDF generator

---

## INFRAESTRUCTURA

### 🟡 I1 — Worker en Docker Compose
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Creado `docker/worker.Dockerfile` con build multi-stage. Agregado servicio `worker` a `docker-compose.yml` con healthcheck y `restart: unless-stopped`. Variables de entorno sincronizadas.
- **Archivos:** `docker/worker.Dockerfile`, `docker-compose.yml`

### 🟡 I2 — Healthchecks en contenedores Docker
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Healthchecks agregados a API (`/health`) y Web (`wget localhost:3001`). PostgreSQL y Redis ya tenían healthchecks.
- **Archivos:** `docker-compose.yml`

### 🟢 I3 — Sistema de migraciones real
- **Estado:** ⬜
- **Detalle:** El proyecto usa `prisma db push` en vez de migraciones formales. Solo existe una migración SQL manual (`02_add_row_level_security.sql`). Migrar a `prisma migrate dev` como flujo estándar.
- **Archivos:** `prisma/`, scripts

### 🟢 I4 — Logging estructurado
- **Estado:** ✅ (2026-05-04)
- **Detalle:** `pino` instalado con `pino-pretty` para desarrollo. Logger exportado desde `packages/infrastructure`. Reemplazados todos los `console.log`/`console.error` en API y worker. Error handler incluye contexto (orgId, requestId).
- **Archivos:** `packages/infrastructure/src/logging/logger.ts`, `apps/api/src/routes/*.ts`, `apps/worker/src/index.ts`

### 🔵 I5 — Monitoreo y métricas
- **Estado:** ⬜
- **Detalle:** Sin métricas de API (latencia, throughput, errores), worker (jobs procesados, fallos), ni S3 (uploads, tamaño). Agregar endpoint `/metrics` con Prometheus o similar.

---

## FRONTEND — UI/UX

### 🟡 F1 — Dashboard mejorado con KPIs
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Dashboard rediseñado con 4 KPI cards (total, mes, aprobación, valor total). Agregado endpoint `GET /api/v1/reports/stats`. Búsqueda por título, filtros por estado, ordenamiento y paginación real implementados en UI.
- **Archivos:** `apps/web/src/app/dashboard/page.tsx`, `apps/api/src/routes/reports.routes.ts`

### 🟡 F2 — Búsqueda y filtrado en dashboard
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Búsqueda por título, filtro por estado, ordenamiento por fecha/título/estado/severidad, y paginación real implementados. El backend ya soportaba skip/take/search/sortBy/sortOrder.
- **Archivos:** `apps/web/src/app/dashboard/page.tsx`, `apps/api/src/routes/reports.routes.ts`

### 🟡 F3 — Vista previa PDF en browser
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Endpoint `/api/v1/reports/:id/pdf` ahora soporta `?preview=true` para `Content-Disposition: inline`. Modal con iframe agregado en el frontend. Botón "Vista previa" junto a "Descargar PDF". Blob URL con cleanup.
- **Archivos:** `apps/api/src/routes/reports.routes.ts`, `apps/web/src/app/reports/[id]/page.tsx`

### 🟡 F4 — Gestión de perfil de usuario
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Página `/profile` creada con edición de nombre, apellido, email y cambio de password. AuthContext expone `setUser` para actualizar estado global. Link al perfil agregado en navbar.
- **Archivos:** `apps/web/src/app/profile/page.tsx`, `apps/web/src/lib/auth.tsx`, `apps/web/src/components/navbar.tsx`

### 🟡 F5 — Gestión de equipo y membresías
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Tab "Equipo" agregado en `/settings` con tabla de miembros, cambio de rol inline (select), desactivar miembro, y modal de invitación con generación de contraseña temporal copiable. Solo visible/administrable por ADMIN.
- **Archivos:** `apps/web/src/app/settings/page.tsx`

### 🟢 F6 — Sistema i18n formal
- **Estado:** ✅ (2026-05-03)
- **Detalle:** `next-intl` instalado. Archivos `messages/es.json`, `en.json`, `pt.json` creados con ~150 claves cada uno. `I18nProvider` con carga dinámica y `useLocale` hook. Componentes traducidos: navbar, dashboard, settings, profile. Persistencia de idioma en localStorage.
- **Archivos:** `apps/web/messages/`, `apps/web/src/components/i18n-provider.tsx`, `apps/web/src/app/layout.tsx`

### 🟢 F7 — Reemplazar polling con WebSocket/SSE
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Endpoint SSE `GET /api/v1/reports/:id/events` implementado. Emite eventos `status-change` y `done` con polling interno cada 2s. Frontend usa `EventSource` con token via query param. Auth middleware actualizado para aceptar `?token`. Reemplaza `setInterval` cada 3s en vista de reporte.
- **Archivos:** `apps/api/src/routes/reports.routes.ts`, `apps/web/src/app/reports/[id]/page.tsx`, `apps/api/src/middleware/auth.middleware.ts`

### 🔵 F8 — Notificaciones email
- **Estado:** ⬜
- **Detalle:** No hay servicio de email. Agregar notificaciones cuando un reporte se completa o falla. Integrar con SendGrid, Resend o similar.
- **Archivos:** Nuevo servicio en `packages/infrastructure/src/email/`

### 🔵 F9 — Notificaciones in-app (toast)
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Detección de transición de estado en polling: cuando un reporte pasa de PROCESSING/TRANSCRIBING/ANALYZING a COMPLETED o FAILED, se muestra toast con link al detalle. Implementado tanto en dashboard como en vista de reporte.
- **Archivos:** `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/reports/[id]/page.tsx`

### 🟢 F10 — Landing page de marketing
- **Estado:** ✅ (2026-05-04)
- **Detalle:** Landing page completa en `/` con redirección inteligente (logueados → `/dashboard`). Secciones: Hero, Cómo funciona, Features, Pricing, CTA, Footer. Responsive, i18n-ready, SEO metadata.
- **Archivos:** `apps/web/src/components/landing/*`, `apps/web/src/app/page.tsx`

---

## BACKEND — Features Faltantes

### 🟡 B1 — Endpoint PATCH /api/v1/auth/me (actualizar perfil)
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Endpoint implementado. Soporta actualización de perfil (firstName, lastName, email) y cambio de password (con verificación de currentPassword). Valida email único.
- **Archivos:** `apps/api/src/routes/auth.routes.ts`

### 🟡 B2 — Endpoints de gestión de equipo
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Endpoints implementados en `organization.routes.ts`: GET /members, POST /members/invite (con password temporal), PATCH /members/:id/role, DELETE /members/:id (soft delete). Solo ADMIN puede invitar/cambiar rol/desactivar. No se permite auto-desactivar ni auto-cambiar rol.
- **Archivos:** `apps/api/src/routes/organization.routes.ts`

### 🟡 B3 — Endpoint POST/DELETE /api/v1/templates (CRUD completo)
- **Estado:** ✅ (2026-05-03)
- **Detalle:** CRUD de templates ya existía en API. Selector de template funciona en form de creación (`/reports/new`). Fetch de templates, estado `templateId` y envío en POST correctos.
- **Archivos:** `apps/api/src/routes/templates.routes.ts`, `apps/web/src/app/reports/new/page.tsx`

### 🟢 B4 — Endpoint GET /api/v1/reports con búsqueda y ordenamiento
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Búsqueda por título (`search`), ordenamiento (`sortBy`, `sortOrder`) ya implementados en `PrismaReportRepository.findMany()`. Pendiente filtros por `clientId`, `severity`, rango de fechas.
- **Archivos:** `apps/api/src/routes/reports.routes.ts`, `packages/infrastructure/src/database/prisma-report.repository.ts`

### 🟢 B5 — Validación de límites de plan
- **Estado:** ✅ (2026-05-03)
- **Detalle:** Check de límite de reportes implementado en `POST /reports` (S7). Pendiente verificar límite de almacenamiento en upload de archivos.
- **Archivos:** `apps/api/src/routes/reports.routes.ts`

---

## TESTING

### 🟡 T1 — Tests de API routes
- **Estado:** ✅ (2026-05-04)
- **Detalle:** 35 tests de integración pasando para auth (15), clients (8), organization (4), reports (7), reports (1). Usa supertest + Jest + PostgreSQL real.
- **Archivos:** `apps/api/src/__tests__/`

### 🟡 T2 — Tests del worker pipeline
- **Estado:** ⬜
- **Detalle:** 0 tests para el worker BullMQ. Agregar tests unitarios para el flujo de procesamiento, transcripción y análisis de IA (con mocks).
- **Archivos:** Nuevo directorio `apps/worker/src/__tests__/`

### 🟢 T3 — Tests de servicios de infraestructura
- **Estado:** ⬜
- **Detalle:** Solo hay tests para JWT, password y S3 format. Faltan tests para: PDFGeneratorService, QueueService, NvidiaService, WhisperService, S3Service operaciones completas.
- **Archivos:** `packages/infrastructure/src/**/*.test.ts`

### 🟢 T4 — Tests del frontend
- **Estado:** ⬜
- **Detalle:** 0 tests para componentes React. Agregar tests unitarios con React Testing Library para componentes clave (EditableField, ChatPanel, Dashboard).
- **Archivos:** Nuevo directorio `apps/web/src/__tests__/`

### 🔵 T5 — Tests E2E
- **Estado:** ⬜
- **Detalle:** 0 tests end-to-end. Agregar Playwright o Cypress para flujos principales: registro, login, creación de reporte, chat con IA.
- **Archivos:** Nuevo directorio `e2e/`

---

## MEJORAS DE CÓDIGO

### 🟢 C1 — Extraer lógica de negocio de rutas a use cases
- **Estado:** ⬜
- **Detalle:** Las rutas de chat tienen ~350 líneas con lógica de negocio (transcripción, llamada a IA, parseo de MODIFY/SUGGEST). Extraer a services o use cases en `packages/`.
- **Archivos:** `apps/api/src/routes/chat.routes.ts`

### 🟢 C2 — Logging consistente en API y Worker
- **Estado:** ⬜
- **Detalle:** API usa `morgan` HTTP logging. Worker usa `console.log`. Unificar con logger estructurado que incluya context (orgId, reportId, jobId).
- **Archivos:** `apps/api/src/index.ts`, `apps/worker/src/index.ts`

### 🟢 C3 — Manejo de errores consistente
- **Estado:** ⬜
- **Detalle:** Algunas rutas retornan `{ error: string }`, otras incluyen detalles. Crear clase `AppError` con status code y tipo de error, y un error handler centralizado.
- **Archivos:** `apps/api/src/middleware/`, rutas

### 🔵 C4 — Variables de entorno validadas al inicio
- **Estado:** ⬜
- **Detalle:** No hay validación de env vars al arrancar. Agregar schema Zod para validar que todas las variables requeridas existen y tienen formato correcto. Fallar rápido si falta algo.
- **Archivos:** `apps/api/src/index.ts`, `apps/worker/src/index.ts`

---

## PROGRESO

| Fase | Progreso | Notas |
|------|----------|-------|
| FASE 1 — Presupuesto Real | ~100% | i18n formal ✅ |
| FASE 2 — Interactividad | ~95% | Chat completo, template selection en UI, edición inline ✅ |
| FASE 3 — UI/UX Profesional | ~95% | F1✅ F2✅ F3✅ F4✅ F5✅ F6✅ F7✅ F9✅ F10✅, pendiente F8 (email) |
| Seguridad | ~95% | S1✅ S2✅ S3✅ S4✅ S5✅ S6✅ S7✅ S8✅ S9✅ S10✅ |
| Testing | ~40% | 46 tests pasando (API + infra), falta worker/frontend/E2E |
| Arquitectura Limpia | ~85% | A1✅ A2✅ A3✅ A5✅ C3✅, falta A4 A6 A7 |
| Infraestructura | ~70% | I1✅ I2✅ I4✅, pendiente I3 I5 |
| Frontend | ~100% | F1✅ F2✅ F3✅ F4✅ F5✅ F6✅ F7✅ F8⬜ F9✅ F10✅ |

---

## CONVENCIÓN DE ACTUALIZACIÓN

Al completar una tarea:
1. Cambiar **⬜** → **✅**
2. Agregar fecha de completitud: `✅ (2026-05-XX)`
3. Si se encontró un problema al implementar, agregar nota
4. Si una tarea se vuelve irrelevante, cambiar a **❌** con motivo
5. Actualizar la tabla de progreso al final del archivo