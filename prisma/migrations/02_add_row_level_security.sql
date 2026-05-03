-- Enable Row Level Security for multi-tenancy

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable RLS on tenant-isolated tables
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Template" ENABLE ROW LEVEL SECURITY;

-- Force RLS on User, Report, Template (even table owners can't bypass)
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Report" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Template" FORCE ROW LEVEL SECURITY;

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION app.set_current_organization_id(org_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current organization ID
CREATE OR REPLACE FUNCTION app.get_current_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_organization_id', true)::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User table policies
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

-- Report table policies
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

-- Template table policies (organizations can see global templates too)
CREATE POLICY "template_select_global_or_own_org" ON "Template"
  FOR SELECT
  USING ("organizationId" IS NULL OR "organizationId" = app.get_current_organization_id());

CREATE POLICY "template_insert_own_org" ON "Template"
  FOR INSERT
  WITH CHECK ("organizationId" = app.get_current_organization_id());

CREATE POLICY "template_update_own_org" ON "Template"
  FOR UPDATE
  USING ("organizationId" = app.get_current_organization_id());
