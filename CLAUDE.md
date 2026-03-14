# CLAUDE.md

## Mission
Build Nadif from the ground up as a premium, multi-tenant cleaning-business operating system with:
- staff-facing surfaces
- customer-facing surfaces
- provider-facing surfaces
- canonical backend logic
- zero duplicated ownership
- premium UI/UX quality

The target is not "something that works".
The target is a clean, scalable, production-grade foundation that stays understandable as it grows.

---

## Core Product Rules

### 1) Multi-tenant is non-negotiable
Every feature must be tenant-safe by design.
Never add logic that can leak, mix, or infer data across tenants.

Required:
- tenant-scoped queries
- tenant-aware query keys
- tenant-aware routes where applicable
- tenant-aware Supabase RLS assumptions
- tenant-safe RPC design

### 2) Canonical ownership is non-negotiable
Every domain must have one clear owner.

Examples:
- booking pricing logic: one canonical pricing engine
- booking modification flows: one canonical modification suite
- automations config: one canonical automations surface
- scheduling context: one canonical resolver
- payment state: one canonical lifecycle model

Do not create duplicate flows, duplicate settings surfaces, or shadow systems.

### 3) No fake production behavior
Do not leave mock data, hardcoded cards, fake API success, fake tenant config, placeholder auth, or fake edge-function responses in production paths.

Allowed:
- isolated demo mode
- explicit storybook/demo fixtures
- development-only mocks behind clear guards

Not allowed:
- production UI reading mock arrays as if they are real data

### 4) Premium UX is a product requirement
UI must feel premium, calm, high trust, and operationally clear.
The quality bar is the best existing Nadif staff surfaces, not generic admin dashboards.

Required:
- clear information hierarchy
- minimal clutter
- excellent spacing
- strong empty states
- explicit statuses
- graceful loading/error states
- no dead-end clicks
- no "mystery meat" actions

### 5) Audit before changing
Before modifying an existing domain:
- identify the canonical owner
- identify routes, hooks, API modules, RPCs, tables, and edge functions involved
- identify whether the requested change conflicts with existing ownership
- state what will be preserved, replaced, or deleted

Do not blindly patch.

### 6) No destructive cleanup without proof
Do not delete code, files, routes, hooks, exports, or migrations unless all of the following are true:
- replacement surface is already identified
- all imports/usages are proven
- route and surface impact is known
- migration path is stated
- compile and smoke verification are done

### 7) Build vertical slices, not disconnected surfaces
Do not build isolated screens with no end-to-end path.
Every major effort should land as a complete slice with:
- data model
- API/RPCs
- route
- UI
- state
- success/error handling
- audit trail where needed

---

## Required Build Order
Build in this order unless an approved plan says otherwise:

1. Foundation
2. Auth + tenant context
3. Design system + app shell
4. Canonical data model
5. Customer + address model
6. Booking creation slice
7. Quote slice
8. Payment slice
9. Provider assignment + operations
10. Staff command surfaces
11. Automations
12. Analytics and optimization

Do not jump ahead into fancy edge features before core lifecycle integrity exists.

---

## Technical Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind + shadcn/ui
- State: TanStack Query for server state, Zustand only where complexity clearly justifies it
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions, RPCs)
- Deploy: Vercel
- Source control: GitHub
- CI: GitHub Actions

---

## Frontend Rules

### Server state
Use TanStack Query for server state.
Do not use local component state for shared backend data.

### Client state
Use local state for local UI only.
Use Zustand only for complex multi-step workflows or command surfaces where local state becomes unmanageable.

### Query key rules
Every query key must be:
- domain-based
- stable
- tenant-aware where appropriate
- centralized in query key factories

### Route rules
Every route must have:
- clear ownership
- loading state
- error state
- empty state if data-driven

### Component rules
Prefer:
- domain folders
- small composable components
- explicit props
- barrel exports only when maintained carefully

Avoid:
- giant mixed-responsibility components
- copy-pasted variant pages
- "temporary" duplicate components that become permanent

---

## Supabase Rules

### Migrations
All schema changes must go through migrations.
No manual production-only schema drift.

### RPC policy
Use RPCs when:
- business rules must be canonical
- multiple tables change together
- permission checks must be centralized
- lifecycle calculations must be consistent

### Edge function policy
Use edge functions for:
- webhooks
- third-party orchestration
- long-running side effects
- secure integrations

Do not use edge functions where a simple RPC is the canonical solution.

### Auth and tokens
Customer-facing token flows must be explicit and hardened.
No vague token decoding comments like "in a real app we'd verify this".

---

## File and Domain Conventions

### Preferred repo structure
- `src/components`
- `src/pages`
- `src/hooks`
- `src/lib`
- `src/types`
- `src/features`
- `src/contexts`
- `src/state`
- `supabase/functions`
- `supabase/migrations`
- `docs`

### Domain-first naming
Prefer names like:
- `booking-command-center`
- `quote-lifecycle`
- `scheduling-context`
- `payment-recovery`

Avoid vague buckets like:
- `utils2`
- `misc`
- `helpers-final`

---

## Required Planning Output Before Coding
For non-trivial work, Claude must state:

1. goal
2. canonical owner(s)
3. files likely affected
4. backend surfaces involved
5. risk of duplication/regression
6. exact acceptance criteria

Then code.

---

## Required Verification After Coding
Claude must not say "done" unless it includes:

1. files changed
2. what was added/edited/removed
3. `npx tsc --noEmit` result
4. route/surface smoke results
5. known gaps or follow-up items

Compiling is necessary but not sufficient.

---

## Forbidden Behaviors
Do not:
- introduce duplicate surfaces
- silently remove exports/hooks/routes
- hardcode tenant/business data
- fake integrations in production paths
- bypass canonical backend logic with client-only shortcuts
- leave dead-end buttons
- invent data contracts that are not implemented

---

## Definition of Success
Success means:
- canonical ownership is clear
- multi-tenant safety is preserved
- premium UX is present
- end-to-end slice works
- codebase is easier to reason about after the change than before it
