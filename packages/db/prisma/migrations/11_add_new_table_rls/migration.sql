-- Keep the same second-layer isolation used by supabase/rls.sql when
-- migrations are applied by Render. Origin rules are a shared catalog;
-- assignments belong to one organization.
CREATE OR REPLACE FUNCTION app_current_org_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid
$$ LANGUAGE sql STABLE;

ALTER TABLE "CaseAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseAssignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "CaseAssignment_org_isolation" ON "CaseAssignment";
CREATE POLICY "CaseAssignment_org_isolation" ON "CaseAssignment"
  USING ("organizationId" = app_current_org_id())
  WITH CHECK ("organizationId" = app_current_org_id());

ALTER TABLE "OriginRuleCatalog" DISABLE ROW LEVEL SECURITY;
