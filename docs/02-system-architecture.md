# System Architecture

## Purpose of this document

This document defines Nadif’s architectural boundaries.

Its job is to make sure the product is built as:
- a canonical multi-tenant system
- a backend-truth product
- a domain-owned codebase
- a product that stays understandable as it grows

This document does not replace domain ownership rules.
It explains how those domains should be implemented and how the layers should interact.

---

## Architectural goals

Nadif’s architecture must optimize for:

- canonical ownership
- backend truth
- multi-tenant safety
- explicit boundaries
- fewer duplicate flows
- predictable mutations
- strong UI sync after writes
- easier AI-assisted development
- long-term maintainability

The system should make it hard to accidentally create:
- duplicated business logic
- shadow write paths
- page-local truth
- tenant-unsafe data access
- cross-domain drift

---

## Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui

### State
- TanStack Query for server state
- Zustand only for selected complex client workflows

### Backend
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- Postgres RPCs / SQL functions

### Platform
- Vercel
- GitHub Actions

---

## High-level architecture

Nadif should generally flow through these layers:

1. App shell and routes
2. Page surfaces and UI components
3. Domain hooks and mutation/query orchestration
4. API / RPC adapters
5. Canonical backend logic
6. Database / storage / auth systems

This is not just a diagram.
It is an ownership boundary.

---

## Layer definitions

## 1) App shell and routes
This layer owns:
- route structure
- layout shells
- auth gates
- tenant/business resolution entry
- page composition boundaries

This layer does not own:
- business calculations
- mutation rules
- pricing logic
- lifecycle truth
- scattered domain logic

Rules:
- protected routes must resolve valid business membership
- route components should stay thin
- route files should compose domain surfaces, not become service layers
- route protection must not be weakened to compensate for missing onboarding logic

---

## 2) Page surfaces and UI components
This layer owns:
- rendering
- visual hierarchy
- interaction states
- local view state
- form presentation
- empty/loading/error/success experiences

This layer may:
- call domain hooks
- present domain data
- trigger mutations through approved hooks/actions
- manage local UI concerns

This layer must not own:
- canonical business truth
- pricing calculations
- lifecycle state machines
- tenant resolution logic
- duplicated API contracts
- cross-table mutation logic

Rules:
- components present truth; they do not invent it
- local state is for local UI only
- components should remain composable and domain-aware
- no page should become a hidden backend emulator

---

## 3) Domain hooks and orchestration layer
This is the main frontend application layer.

It owns:
- query orchestration
- mutation orchestration
- query invalidation
- optimistic updates when justified
- domain-aware state shaping for the UI
- calling canonical backend contracts

It does not own:
- canonical pricing rules
- canonical scheduling rules
- multi-table business logic that belongs in RPCs
- provider/webhook orchestration that belongs in edge functions

Rules:
- queries and mutations should be domain-owned
- query keys must be stable and tenant-aware where relevant
- mutation hooks must explicitly invalidate or refresh affected consumers
- hooks may shape data for the UI, but not redefine business truth
- hooks should not silently become shadow service layers across multiple unrelated domains

Preferred pattern:
- one domain exposes query/mutation hooks
- pages consume those hooks
- writes go through canonical backend paths
- related surfaces stay in sync through explicit invalidation/refetch behavior

---

## 4) API / RPC adapter layer
This layer owns:
- typed backend calls
- backend contract wrappers
- RPC invocation
- edge function invocation
- consistent error translation where needed

This layer does not own:
- UI decisions
- page behavior
- business logic that belongs in SQL/RPC/backend systems
- view state

Rules:
- adapters should be thin and explicit
- no random fetch calls scattered through pages
- backend contracts should be reusable and centrally understandable
- if multiple surfaces call the same backend behavior, they should go through the same adapter path

---

## 5) Canonical backend logic
This is where Nadif’s critical truth must live.

This layer owns:
- lifecycle rules
- multi-table mutations
- permission-sensitive business logic
- canonical calculations
- idempotent write behavior
- event/audit creation where required
- cross-entity consistency

Main mechanisms:
- RPCs for canonical transactional rules
- database constraints and policies
- shared backend write helpers
- edge functions for external orchestration

Rules:
- if business correctness matters, backend owns it
- if multiple tables must change together, prefer RPC
- if a rule must be consistent across staff/customer/provider flows, backend owns it
- if idempotency matters, backend owns it
- if permission-sensitive behavior must be centralized, backend owns it

---

## 6) Database / auth / storage systems
This layer owns:
- durable data
- auth identity
- tenant-bound relational truth
- storage objects and attachment metadata
- RLS enforcement
- schema constraints
- indexes and relational integrity

Rules:
- schema changes go through migrations
- no manual production schema drift
- no soft architectural assumptions that bypass the database model
- RLS must match actual route/query behavior
- storage usage must have attachment ownership where applicable

---

## Architectural flow rules

## Read path
The standard read flow is:

database/backend truth  
→ adapter/query function  
→ domain hook  
→ page surface  
→ UI component

Reads may be shaped for presentation, but not redefined.

Examples:
- bookings list reads booking truth and presents grouped sections
- dashboard reads trusted metrics and presents guided modules
- booking detail reads payment state, but does not reinterpret payment ownership

## Write path
The standard write flow is:

user action  
→ UI event  
→ domain mutation hook  
→ canonical adapter / RPC / edge function  
→ backend truth update  
→ audit/event emission if required  
→ query invalidation / refetch / optimistic reconciliation  
→ synced UI surfaces

Writes must be explicit.
No hidden secondary write paths.

---

## RPC vs edge function policy

## Use RPCs when
- business rules must be canonical
- multiple tables change together
- calculations must be consistent
- permissions and tenant checks matter
- idempotency matters
- lifecycle transitions must be reliable
- pricing, booking, quote, dispatch, or payment truth is involved

## Use edge functions when
- handling third-party webhooks
- orchestrating external services
- doing secure integration work
- managing long-running or async side effects
- performing work that should not live in the client

## Do not use edge functions when
- an RPC is the more canonical transactional owner
- the logic is really just internal database business logic
- the function would become a shadow domain owner

---

## Client state policy

## TanStack Query
Use TanStack Query for:
- domain reads
- shared server-backed state
- mutation state
- invalidation/refetch handling
- optimistic updates where appropriate

Required:
- stable query keys
- domain-oriented key factories
- tenant awareness where relevant
- explicit invalidation after successful writes

## Zustand
Use Zustand only when:
- the UI is a genuinely complex multi-step flow
- the state is mostly client workflow state
- local component state becomes unmanageable
- the feature is a command surface or wizard with real interaction complexity

Do not use Zustand for:
- ordinary server state
- avoiding proper query architecture
- rebuilding backend truth in the client

---

## Tenant and auth architecture

Tenant context is foundational, not optional.

Required architecture:
- auth identity is separate from business membership
- business membership is the gate for protected staff access
- post-auth business resolution has one canonical decision point
- tenant/business context should be resolved before protected app usage
- route protection must align with real membership truth

Rules:
- auth success is not the same as app readiness
- no route should silently assume a default tenant
- business context should not be guessed in scattered components
- membership should remain the gate, not a workaround target

---

## Domain boundary rules

Each major feature must belong to one primary domain owner.

Architecture must reflect that by ensuring:
- domain hooks stay domain-owned
- adapters map to canonical backend contracts
- UI surfaces do not borrow ownership accidentally
- cross-domain reads do not turn into cross-domain writes

Examples:
- booking flow may read pricing, but pricing rules still live in pricing systems
- dispatch may read providers, but provider truth still belongs to provider systems
- quotes may read scheduling context, but scheduling normalization still belongs to scheduling systems

---

## Cross-domain orchestration rules

Cross-domain work is allowed, but must stay explicit.

When a flow touches multiple domains, define:
- primary domain owner
- touched secondary domains
- canonical write path
- whether orchestration belongs in frontend hook logic, RPC logic, or edge-function logic

Preferred rule:
- UI orchestrates experience
- RPCs orchestrate canonical transactional truth
- edge functions orchestrate external systems

Do not let page components become cross-domain orchestration engines.

---

## Audit and event architecture

Important mutations should produce traceable events.

Required:
- shared audit/event model
- canonical mutation paths should invoke audit/event helpers where appropriate
- event naming should be consistent
- activity timelines should read from canonical event sources, not page-local arrays

Rules:
- do not let some mutation paths log events while others silently skip them
- do not invent different event schemas for equivalent actions
- analytics and audit are related but not identical

---

## Analytics architecture

Analytics must be derived from trusted domain truth and trusted events.

Rules:
- KPI definitions should not live in individual pages
- dashboards should read trusted reporting models or views
- UI-only derived numbers must not be presented as trusted business metrics
- if a metric matters to operations, its definition should be consistent across surfaces

---

## File and attachment architecture

Files should never exist as unowned blobs.

Required:
- storage object ownership
- attachment metadata
- linkage to owning entities where applicable
- secure access behavior
- tenant-safe access patterns

Avoid:
- ad hoc uploads with no canonical attachment model
- duplicate attachment metadata per feature
- direct storage usage with weak ownership boundaries

---

## Sync and freshness rules

The product must not rely on browser refreshes.

Required:
- all meaningful mutations update affected surfaces
- invalidation/refetch strategy is explicit
- detail views, lists, badges, counts, and summaries remain in sync
- optimistic updates only when rollback behavior is clear
- eventual consistency must be intentional and documented

Not allowed:
- “works after refresh”
- stale detail drawers after mutation
- stale list counts after success toast
- route changes used to hide missing synchronization

---

## Error handling and idempotency rules

Critical flows must be safe under retries, refreshes, or duplicate triggers.

Required:
- backend idempotency where the operation needs it
- consistent mutation error handling
- user-visible recovery states where appropriate
- clear distinction between validation, permission, and system failures

Do not:
- rely on the UI to prevent duplicate writes as the only safety measure
- let retries create duplicated records when the domain requires idempotency
- mask backend inconsistency with optimistic UI alone

---

## Vertical slice architecture

A meaningful Nadif feature should usually land as a vertical slice:

- schema or backend contract
- domain adapters
- domain hooks
- route/surface
- UI states
- audit/event handling where needed
- sync/invalidation behavior
- tenant/auth correctness
- role-aware behavior where relevant

Do not ship disconnected shells.

---

## Forbidden architectural patterns

Do not introduce:
- business logic hidden in route components
- client-only pricing or lifecycle truth
- multiple write paths for the same domain without explicit approval
- ad hoc fetch calls scattered through pages
- random helpers that quietly become canonical logic
- duplicated adapters for the same backend behavior
- page-local data contracts that diverge from domain truth
- hooks that span unrelated domains with no ownership clarity
- edge functions used as a shortcut for logic that belongs in RPCs
- “temporary” shadow systems that are likely to become permanent

---

## Required planning before coding

For non-trivial work, Claude must state:

1. primary domain owner
2. touched secondary domains
3. read path
4. write path
5. backend owner of truth
6. whether RPC, edge function, or simple adapter is appropriate
7. tenant/auth/RLS impact
8. sync/invalidation plan
9. acceptance criteria

If those are not clear, implementation should not start.

---

## Required architecture check before calling work done

Claude must be able to explain:

1. where the business truth lives
2. why the chosen write path is canonical
3. why the UI is not owning backend rules
4. how related surfaces stay in sync
5. how tenant safety is preserved
6. why this does not create duplicate ownership
7. what layer owns each important part of the change

If those answers are weak, the architecture is not done.

---

## Definition of architectural success

Nadif architecture is successful when:
- ownership is explicit
- critical truth lives in backend systems
- UI layers stay thin and intentional
- cross-domain work is understandable
- mutations are predictable and synced
- tenant safety is preserved
- the codebase becomes easier to reason about as it grows