-- =====================================================
-- Row-Level Security for Multi-Tenant Data Isolation
-- =====================================================
-- This migration enables RLS on all tenant-scoped tables.
-- It uses a session variable (app.current_organization_id) set by
-- the API middleware on every request to scope queries to the
-- current user's organization.
--
-- Prisma does NOT support RLS natively, so we use a raw SQL
-- approach with pgcrypto extension and SECURITY DEFINER functions.
-- The API must call set_app_current_organization_id(orgId) after
-- each Prisma connection is acquired, and clearCurrentOrganizationId()
-- before returning the connection to the pool.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema for app-level functions
CREATE SCHEMA IF NOT EXISTS app;

-- =====================================================
-- Function to set current organization context (call per request)
-- =====================================================
CREATE OR REPLACE FUNCTION app.set_current_organization_id(org_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to get current organization context
-- =====================================================
CREATE OR REPLACE FUNCTION app.get_current_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_organization_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Enable RLS on all tenant-scoped tables
-- =====================================================

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (superusers bypass by default)
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Report" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Template" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" FORCE ROW LEVEL SECURITY;

-- =====================================================
-- Organization policies
-- =====================================================
CREATE POLICY "org_select_own" ON "Organization"
  FOR SELECT
  USING (id = app.get_current_organization_id());

CREATE POLICY "org_update_own" ON "Organization"
  FOR UPDATE
  USING (id = app.get_current_organization_id());

-- =====================================================
-- User policies
-- =====================================================
CREATE POLICY "user_select_own_org" ON "User"
  FOR SELECT
  USING ("organizationId" = app.get_current_organization_id());

CREATE POLICY "user_insert_own_org" ON "User"
  FOR INSERT
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "user_update_own_org" ON "User"
  FOR UPDATE
  USING ("organizationId" = app.get_current_organization_id())
  WITH CHECK ("organizationId" = app.get_current_organization_id());

-- =====================================================
-- Report policies
-- =====================================================
CREATE POLICY "report_select_own_org" ON "Report"
  FOR SELECT
  USING ("organizationId" = app.get_current_organization_id());

CREATE POLICY "report_insert_own_org" ON "Report"
  FOR INSERT
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "report_update_own_org" ON "Report"
  FOR UPDATE
  USING ("organizationId" = app.get_current_organization_id())
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "report_delete_own_org" ON "Report"
  FOR DELETE
  USING ("organizationId" = app.get_current_organization_id());

-- =====================================================
-- Template policies (org can see global templates too)
-- =====================================================
CREATE POLICY "template_select_global_or_own_org" ON "Template"
  FOR SELECT
  USING ("organizationId" IS NULL OR "organizationId" = app.get_current_organization_id());

CREATE POLICY "template_insert_own_org" ON "Template"
  FOR INSERT
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "template_update_own_org" ON "Template"
  FOR UPDATE
  USING ("organizationId" = app.get_current_organization_id());

CREATE POLICY "template_delete_own_org" ON "Template"
  FOR DELETE
  USING ("organizationId" = app.get_current_organization_id());

-- =====================================================
-- Client policies
-- =====================================================
CREATE POLICY "client_select_own_org" ON "Client"
  FOR SELECT
  USING ("organizationId" = app.get_current_organization_id());

CREATE POLICY "client_insert_own_org" ON "Client"
  FOR INSERT
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "client_update_own_org" ON "Client"
  FOR UPDATE
  USING ("organizationId" = app.get_current_organization_id())
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "client_delete_own_org" ON "Client"
  FOR DELETE
  USING ("organizationId" = app.get_current_organization_id());

-- =====================================================
-- ChatMessage policies (via report's organizationId)
-- =====================================================
CREATE POLICY "chat_select_own_org" ON "ChatMessage"
  FOR SELECT
  USING ("reportId" IN (SELECT id FROM "Report" WHERE "organizationId" = app.get_current_organization_id()));

CREATE POLICY "chat_insert_own_org" ON "ChatMessage"
  FOR INSERT
  WITH CHECK ("reportId" IN (SELECT id FROM "Report" WHERE "organizationId" = app.get_current_organization_id()));