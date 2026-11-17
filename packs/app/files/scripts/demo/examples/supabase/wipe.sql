-- EXAMPLE wipe for a Supabase demo project. Edit the keep list, then point
-- steps.wipe at your own copy.
--
--   psql "$DEMO_DB_URL" -v ON_ERROR_STOP=1 -v demo_ref="$DEMO_TARGET" -f wipe.sql
--
-- One transaction: either every app table is empty and every account is gone,
-- or nothing changed.
--
-- It refuses unless demo_ops.marker holds exactly the reference passed in.
-- That check runs inside the database being wiped, so it holds even when
-- every variable outside it is wrong.

\set ON_ERROR_STOP on
begin;

select set_config('demo.expected_ref', :'demo_ref', true);

do $$
declare
  expected text := current_setting('demo.expected_ref');
  found    text[];
  -- Reference tables the product cannot run without and migrations fill
  -- (lookup rows, plans, settings). Everything else in the schema is wiped.
  keep     text[] := array[]::text[];   -- e.g. array['plans', 'settings']
  targets  text;
begin
  if to_regclass('demo_ops.marker') is null then
    raise exception 'refusing to wipe: demo_ops.marker does not exist; this is not a prepared demo database';
  end if;
  select array_agg(project_ref) into found from demo_ops.marker;
  if found is null or array_length(found, 1) <> 1 or found[1] <> expected or expected = '' then
    raise exception 'refusing to wipe: demo_ops.marker does not hold exactly the expected reference';
  end if;

  select string_agg(format('%I.%I', schemaname, tablename), ', ')
    into targets
    from pg_tables
   where schemaname = 'public' and tablename <> all (keep);

  -- No CASCADE: if a kept table, or a table in another schema, references
  -- one of these, the statement fails loudly instead of widening the wipe.
  if targets is not null then
    execute 'truncate table ' || targets;
  end if;

  -- Sign-in accounts. Sessions and identities go with them. A kept table
  -- whose rows reference an account with ON DELETE CASCADE loses those rows
  -- here; include such a table in the post-check.
  if to_regclass('auth.users') is not null then
    delete from auth.users;
  end if;
end $$;

commit;
