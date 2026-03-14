# System Architecture

## Stack
- React + TypeScript + Vite
- Tailwind + shadcn/ui
- TanStack Query
- Zustand for selected complex flows only
- Supabase Postgres/Auth/Storage/Functions/RPC
- Vercel
- GitHub Actions

## High-level architecture
1. UI surfaces
2. domain hooks
3. API/RPC adapters
4. canonical backend logic
5. database

## Rules
- UI components do not own business truth
- hooks orchestrate state and mutations
- API modules wrap backend contracts
- RPCs own canonical multi-table rules
- edge functions own webhooks and external orchestration

## Critical architecture rules
- prefer RPC over duplicated client calculations
- prefer one domain service over scattered helpers
- prefer explicit dependency boundaries
