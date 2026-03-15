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

## Migrations Overview (Phase 1A)

| Migration | Purpose |
|-----------|---------|
| `00001_auth_tenant_foundation.sql` | Core auth tables (profiles, tenants, tenant_memberships) |
| `00002_create_tenant_rpc.sql` | Business creation RPC |
| `00003_fix_create_tenant_rpc.sql` | Profile existence safety |
| `00004_fix_rls_recursion.sql` | RLS optimization |
| `00005_nadif_enums.sql` | All Nadif enum types (canonical, locked) |
| `00006_workspace_security.sql` | Server-enforced workspace model |
| `00007_core_tables.sql` | All core tables (services, customers, bookings, etc.) |
| `00008_deferred_fks.sql` | Self-referential and circular FKs |
| `00009_rls_policies.sql` | RLS policies for all tables |
| `00010_booking_rpcs.sql` | Booking lifecycle state machine RPCs |
| `00011_pricing_engine.sql` | Canonical pricing calculation |
| `00012_recurring_rpcs.sql` | Recurring series and deep clean RPCs |
| `00013_utility_rpcs.sql` | Helper RPCs and dashboard functions |

## Canonical RPC Owners

| RPC | Spec Owner | Purpose |
|-----|------------|---------|
| `create_draft_booking` | B.1 | Start booking flow |
| `send_quote` | B.1 | Draft → quote_pending |
| `confirm_booking` | B.1 | quote_accepted → confirmed |
| `assign_provider` | B.1 | confirmed → scheduled |
| `skip_occurrence` | C.5 | Skip recurring booking |
| `calculate_booking_price` | A.5 | Single pricing authority |
| `create_recurring_series` | C.1 | Setup recurring (Option B) |
| `resolve_first_occurrence_override` | C.3 | Override pairing resolution |
| `evaluate_deep_clean_required` | C.4 | Computed deep clean check |
| `switch_workspace` | 2.4 | Change active tenant |

## Development Commands

```bash
# Reset database with migrations + seed
supabase db reset

# Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.ts

# Start local Supabase
supabase start

# Run migrations on remote
supabase db push
```

## Seed Data

Run `generate_dev_test_data(user_id)` to create a complete test tenant with:
- Services (deep clean + standard clean with override pairing)
- Add-ons
- Customer with property
- Draft booking
- Deep clean policies

## Required next setup
- [ ] RLS review checklist
- [x] local seed script (seed.sql + generate_dev_test_data function)
- [ ] staging seed/demo tenant
