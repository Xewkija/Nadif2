# Nadif Rebuild Bootstrap

This folder contains the governance, workflow, and operating files for a ground-up rebuild of Nadif.

## Purpose
These files are here to make the rebuild:
- consistent
- auditable
- multi-tenant by default
- safe for AI-assisted development
- aligned with premium UX and canonical ownership rules

## Put these in your repo before building
1. Copy everything in this folder into the project root.
2. Review and customize:
   - `CLAUDE.md`
   - `.env.example`
   - `.github/CODEOWNERS`
   - `.github/workflows/ci.yml`
3. Create the matching GitHub environments:
   - `preview`
   - `staging`
   - `production`
4. Set the matching Vercel and Supabase environment variables.
5. Start with the first vertical slice from `docs/11-vertical-slice-order.md`.

## Core principle
Do not start by building random pages.

Build one complete slice at a time:
tenant → auth → customer → booking → quote → payment → provider → staff operations

Everything else hangs off that.
