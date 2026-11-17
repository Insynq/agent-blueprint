-- EXAMPLE. Demo only. Run once, by a person, in the DEMO project's SQL editor.
-- Never in production, never as a migration (migrations run in production).
--
-- Creates the marker the reset's pre-check and wipe.sql both require, and the
-- table that records when the last full reset finished. Both live in their own
-- schema, which the wipe does not touch.
--
-- Replace both placeholders before running.

create schema if not exists demo_ops;
revoke all on schema demo_ops from public;

create table if not exists demo_ops.marker (
  project_ref text primary key,
  created_at  timestamptz not null default now(),
  constraint marker_not_production check (project_ref <> '<production project reference>')
);

create table if not exists demo_ops.state (
  key   text primary key,
  value text not null
);

revoke all on all tables in schema demo_ops from public;

insert into demo_ops.marker (project_ref) values ('<demo project reference>')
on conflict do nothing;
