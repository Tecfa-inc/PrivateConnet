-- ADM-15: the audit log can be written but never changed or deleted.
-- Add this to the first migration (`npx prisma migrate dev --create-only`, then append).

CREATE OR REPLACE FUNCTION audit_log_reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is insert-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_change();

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_change();

-- The app's database user may only insert and read audit rows.
-- (Run as the migration user; the role name matches .env.example.)
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM privateconnet_app;
