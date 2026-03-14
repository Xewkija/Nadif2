# Supabase Notes

## Environment strategy
Use separate Supabase projects for:
- local/dev
- staging
- production

## Rules
- do not point local work at production
- do not test destructive migrations in production first
- keep edge functions versioned in repo
- document every RPC that is a canonical business owner

## Required next setup
- RLS review checklist
- local seed script
- staging seed/demo tenant
