-- Closed Loop V4.3: reproduce the audited production privilege boundary.
-- The SECURITY DEFINER materialization RPC runs as its function owner;
-- service_role does not require direct table privileges.
begin;
revoke all privileges on table public.closed_loop_materializations
  from public, anon, authenticated, service_role;
commit;
