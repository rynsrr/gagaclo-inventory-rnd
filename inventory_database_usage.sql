BEGIN;
CREATE OR REPLACE FUNCTION public.inventory_database_bytes()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.pg_database_size(pg_catalog.current_database());
$$;
REVOKE ALL ON FUNCTION public.inventory_database_bytes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inventory_database_bytes() TO anon, authenticated;
COMMIT;
