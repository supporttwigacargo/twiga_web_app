import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs/promises'
import path from 'node:path'

// Supabase platform shims only; all application migrations and RPCs run unchanged.
const repo = path.resolve(import.meta.dirname, '../../..')
export async function database() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create publication supabase_realtime;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
    grant usage on schema public, auth, storage to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    alter default privileges in schema public grant all on tables to authenticated;
    alter default privileges in schema public grant all on sequences to authenticated;
  `)
  const files = (await fs.readdir(path.join(repo, 'supabase/migrations'))).filter(name => name.endsWith('.sql')).sort()
  for (const name of files) {
    try { await db.exec(await fs.readFile(path.join(repo, 'supabase/migrations', name), 'utf8')) }
    catch (error) { await db.close(); throw new Error(`MIGRATION FAILED ${name}: ${error.message}`) }
  }
  return db
}

if (process.argv[1] === import.meta.filename) {
  try {
  const db = await database()
  console.log('PASS: all migrations applied to isolated PostgreSQL')
  await db.exec(await fs.readFile(path.join(repo, 'supabase/migrations/20261029090000_shipment_invoice_corrections.sql'), 'utf8'))
  console.log('PASS: new migration is repeatable')
  await db.close()
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}

