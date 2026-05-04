-- =====================================================
-- Initial Schema Migration
-- Creates all tables for the OmniReport application
-- =====================================================

-- =====================================================
-- Enums (must be created before tables that use them)
-- =====================================================
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'TRANSCRIBING', 'ANALYZING', 'COMPLETED', 'DRAFT', 'APPROVED', 'FAILED');
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
CREATE TYPE "Industry" AS ENUM ('GENERAL', 'AUTOMOTIVE', 'CONSTRUCTION', 'MANUFACTURING', 'INSURANCE', 'REAL_ESTATE');

-- Organization (tenant)
CREATE TABLE "Organization" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  logoUrl     TEXT,
  address     TEXT,
  phone       VARCHAR(50),
  taxId       VARCHAR(50),
  country     VARCHAR(100),
  currency    VARCHAR(10) DEFAULT 'CLP',
  language    VARCHAR(10) DEFAULT 'es',
  plan        "Plan" DEFAULT 'FREE',
  maxReports  INTEGER DEFAULT 10,
  maxStorage  BIGINT DEFAULT 1073741824,
  isActive    BOOLEAN DEFAULT true,
  createdAt   TIMESTAMPTZ DEFAULT now(),
  updatedAt   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "Organization_slug_idx" ON "Organization"(slug);

-- User (belongs to organization)
CREATE TABLE "User" (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  passwordHash   TEXT NOT NULL,
  firstName      VARCHAR(100) NOT NULL,
  lastName       VARCHAR(100) NOT NULL,
  role           "UserRole" DEFAULT 'MEMBER',
  isActive       BOOLEAN DEFAULT true,
  organizationId UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  createdAt      TIMESTAMPTZ DEFAULT now(),
  updatedAt      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "User_email_idx" ON "User"(email);
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- Template (optional organization scope)
CREATE TABLE "Template" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  industry        "Industry" DEFAULT 'GENERAL',
  systemPrompt    TEXT NOT NULL,
  outputFormat    JSONB NOT NULL DEFAULT '{}',
  isActive        BOOLEAN DEFAULT true,
  organizationId  UUID REFERENCES "Organization"(id) ON DELETE CASCADE,
  createdAt       TIMESTAMPTZ DEFAULT now(),
  updatedAt       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "Template_organizationId_idx" ON "Template"("organizationId");
CREATE INDEX "Template_industry_idx" ON "Template"(industry);

-- Client (belongs to organization)
CREATE TABLE "Client" (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255),
  phone          VARCHAR(50),
  address        TEXT,
  taxId          VARCHAR(50),
  organizationId UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  createdAt      TIMESTAMPTZ DEFAULT now(),
  updatedAt      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");

-- Report (belongs to organization, user, optional template, optional client)
CREATE TABLE "Report" (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  status            "ReportStatus" DEFAULT 'PENDING',
  severity          "Severity",
  organizationId    UUID NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  userId            UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  templateId        UUID REFERENCES "Template"(id) ON DELETE SET NULL,
  clientId          UUID REFERENCES "Client"(id) ON DELETE SET NULL,

  audioUrl          TEXT,
  audioTranscript   TEXT,
  imageUrls         TEXT[] DEFAULT '{}',

  findings          JSONB,
  executiveSummary  TEXT,
  recommendedAction TEXT,
  aiModel           VARCHAR(100),
  aiResponseTime    INTEGER,

  subtotal          DOUBLE PRECISION,
  taxRate           DOUBLE PRECISION DEFAULT 19,
  tax               DOUBLE PRECISION,
  total             DOUBLE PRECISION,
  currency          VARCHAR(10) DEFAULT 'CLP',
  language          VARCHAR(10),
  paymentTerms      TEXT,

  metadata          JSONB,
  tags              TEXT[] DEFAULT '{}',

  createdAt         TIMESTAMPTZ DEFAULT now(),
  updatedAt         TIMESTAMPTZ DEFAULT now(),
  completedAt       TIMESTAMPTZ
);

CREATE INDEX "Report_organizationId_idx" ON "Report"("organizationId");
CREATE INDEX "Report_userId_idx" ON "Report"("userId");
CREATE INDEX "Report_status_idx" ON "Report"(status);
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_clientId_idx" ON "Report"("clientId");

-- ChatMessage (belongs to report)
CREATE TABLE "ChatMessage" (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reportId   UUID NOT NULL REFERENCES "Report"(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL,
  content    TEXT NOT NULL,
  createdAt  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "ChatMessage_reportId_idx" ON "ChatMessage"("reportId");

-- =====================================================
-- Trigger to auto-update updatedAt
-- =====================================================
CREATE OR REPLACE FUNCTION update_updatedAt_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_updatedAt BEFORE UPDATE ON "Organization"
  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_user_updatedAt BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_template_updatedAt BEFORE UPDATE ON "Template"
  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_client_updatedAt BEFORE UPDATE ON "Client"
  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();

CREATE TRIGGER update_report_updatedAt BEFORE UPDATE ON "Report"
  FOR EACH ROW EXECUTE FUNCTION update_updatedAt_column();