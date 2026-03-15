# Repo Structure

## Purpose of this document

This document defines how Nadif code should be organized.

Its job is to keep the codebase:
- domain-owned
- easy to reason about
- hard to duplicate accidentally
- easy for humans and AI to extend safely
- structured for long-term scale

This is not just a folder list.
It is a code placement and boundary document.

---

## Core structure principle

Nadif should be organized by **domain first**, not by random technical buckets.

We prefer:
- code that clearly belongs to a domain living together
- shared code staying genuinely shared
- route files staying thin
- backend contracts being easy to locate
- query and mutation logic staying close to domain ownership

We do not want:
- giant generic utility folders
- scattered domain logic across unrelated directories
- duplicated hooks/adapters/types for the same domain
- route files becoming hidden service layers

---

## Primary organizing rule

When possible, organize by **domain first**, then by responsibility inside the domain.

Example domains:
- bookings
- quotes
- customers
- services
- pricing
- payments
- providers
- dispatch
- automations
- analytics
- tenant-onboarding

This makes ownership easier to see and helps prevent duplicate logic.

---

## Recommended top-level layout

- `src/app` or `src/pages`
- `src/components`
- `src/features`
- `src/hooks`
- `src/lib`
- `src/types`
- `src/state`
- `src/contexts`
- `supabase/migrations`
- `supabase/functions`
- `docs`
- `.github`

This top-level layout is only the starting point.
The important rule is where logic actually belongs inside it.

---

## What each top-level area should own

## `src/app` or `src/pages`
Owns:
- route definitions
- page entry points
- layout composition
- route-level loading/error shells
- route protection boundaries

Must not own:
- core business logic
- domain truth
- duplicated mutation logic
- scattered backend contract code

Rules:
- route files should stay thin
- pages compose domain surfaces; they do not become service layers
- avoid putting canonical business rules directly in routes

---

## `src/features`
This should be the primary home for domain-owned product code.

Each major domain should usually have its own feature area.

Typical contents inside a domain feature:
- UI surfaces specific to that domain
- domain hooks
- query key factories
- adapters/API modules
- domain-specific types
- state for complex domain workflows
- local utilities that are truly domain-specific

Example:
- `src/features/bookings/...`
- `src/features/quotes/...`
- `src/features/customers/...`

Preferred sub-structure inside a domain:
- `components`
- `hooks`
- `api`
- `types`
- `state`
- `utils`
- `constants`

Not every domain needs every subfolder.
Use only what adds clarity.

---

## `src/components`
This should contain truly reusable UI primitives or shared presentation building blocks.

Good candidates:
- layout shells
- reusable form primitives
- shared section headers
- reusable status chips
- modals/drawers/sheets
- shared data-display primitives

Not good candidates:
- domain business logic
- booking-specific “shared” components used only by one domain
- components that secretly depend on one domain’s backend model

Rule:
If a component is only meaningfully used by one domain, it should usually live in that domain’s feature folder, not global `src/components`.

---

## `src/hooks`
Use sparingly.

This folder should contain only truly cross-domain hooks that are not owned by a single feature.

Good examples:
- auth/session hooks
- viewport/media hooks
- generic debouncing hooks
- shared shell/navigation hooks

Do not put domain hooks here by default.

Bad examples:
- `useBookings.ts`
- `useQuoteFlow.ts`
- `usePricingRules.ts`

Those should usually live inside `src/features/<domain>/hooks`.

Rule:
Global `src/hooks` is not a dumping ground.

---

## `src/lib`
This is for cross-domain infrastructure code, not product-domain ownership.

Good candidates:
- Supabase clients
- auth helpers
- environment config
- low-level formatting helpers
- infrastructure wrappers
- generic utility functions with no domain truth

Bad candidates:
- pricing engines
- booking lifecycle helpers
- quote state rules
- payment status truth
- dispatch assignment logic

Rule:
If it encodes domain behavior, it probably does not belong in `src/lib`.

---

## `src/types`
Use for shared cross-domain types only.

Good candidates:
- app-wide utility types
- shared API envelope types
- global session/auth types
- cross-domain foundational entities if truly shared

Avoid:
- dumping every domain type here
- separating types from their domain unnecessarily

Preferred rule:
Domain-specific types should usually live near their domain unless they are truly shared.

---

## `src/state`
Use for shared client-side stores only when complexity justifies it.

Good candidates:
- app shell state
- global command palette state
- cross-domain UI state with real justification

Avoid:
- storing server truth here
- placing domain workflow state here by default
- using this as a shortcut instead of proper domain organization

Preferred rule:
If the state belongs to one domain flow, keep it inside that domain feature.

---

## `src/contexts`
Use only for real React context needs.

Good candidates:
- auth/session context
- tenant/app-shell context
- theme or global UI environment contexts if needed

Avoid:
- using context as a replacement for proper query/state architecture
- putting domain business truth into broad app contexts

---

## `supabase/migrations`
Owns:
- schema evolution
- database changes
- RLS policy changes
- indexes
- functions/RPC definitions where applicable per repo convention

Rules:
- one coherent migration purpose at a time
- no unrelated mixed changes
- migration names should make intent obvious

---

## `supabase/functions`
Owns:
- webhooks
- secure third-party orchestration
- external service integration flows
- long-running backend-side processes

Must not become:
- a shortcut dumping ground for logic that should live in canonical RPC/database ownership

---

## Domain folder rule

A major domain should usually keep its key logic close together.

Preferred example:

`src/features/bookings/`
- `components/`
- `hooks/`
- `api/`
- `types/`
- `state/`
- `utils/`
- `constants/`

This makes it easy to find:
- where the domain UI lives
- where reads/writes happen
- what types it uses
- what state it owns
- what logic is shared only within that domain

This is strongly preferred over scattering booking logic across:
- `src/hooks`
- `src/lib`
- `src/components`
- `src/types`
- `src/state`

with no clear ownership.

---

## Shared vs domain-owned rule

Before placing code in a shared folder, ask:

1. is this truly used across multiple domains?
2. is it free of one domain’s business truth?
3. would another domain understand and use this abstraction naturally?
4. is this shared because it is genuinely generic, or because we are avoiding choosing an owner?

If the answer is weak, keep it in the domain.

### Good shared code
- generic modal shell
- reusable table wrapper
- common date formatting helper
- auth session helper
- status chip primitive without domain truth

### Bad shared code
- pricing helper used “everywhere”
- booking state utility reused by quote flow
- payment status mapper that actually defines business logic
- giant common form builder with hidden domain assumptions

---

## Route file rules

Route/page files should:
- compose surfaces
- wire layout
- connect route params
- apply route-level guards
- delegate domain work to feature modules

Route/page files should not:
- implement core business rules
- define complex mutation flows inline
- become giant orchestration files
- contain copy-pasted domain logic from hooks or adapters

If a route grows too much, the route is usually holding code that belongs in the domain feature.

---

## Hook placement rules

### Domain hooks
Put inside the domain feature when they:
- fetch domain data
- mutate domain data
- shape domain truth for the UI
- own query invalidation for that domain

### Shared hooks
Put in `src/hooks` only when they:
- are clearly cross-domain
- do not own business truth
- are infrastructural or UI-environment oriented

Do not create:
- both a domain hook and a global hook for the same behavior without a very clear reason

---

## API / adapter placement rules

Backend contract wrappers should usually live close to the owning domain.

Preferred:
- `src/features/bookings/api/...`
- `src/features/quotes/api/...`
- `src/features/payments/api/...`

Avoid:
- one giant global API folder with mixed domains
- scattered ad hoc backend calls hidden inside components
- duplicating the same RPC call wrapper in multiple places

Rule:
If a backend contract belongs to one domain, its adapter should usually live near that domain.

---

## Type placement rules

Preferred:
- domain types live with the domain
- shared foundational types live in shared type locations
- generated database types live in their canonical generated location

Avoid:
- forcing every domain type into global `src/types`
- duplicate interfaces for the same entity across folders
- “temporary” types in page files that drift from the source contract

---

## Utility placement rules

Use `utils` carefully.

### Domain utility
If a helper exists only to support one domain’s logic or formatting, keep it inside that domain.

### Shared utility
Only place helpers in shared space if they are:
- truly generic
- stable
- not secretly domain rules

Avoid:
- `utils2`
- `helpers-final`
- giant misc buckets
- unnamed convenience files that become shadow service layers

---

## File naming rules

Prefer names that reveal domain and purpose.

Good:
- `booking-command-center.tsx`
- `use-booking-detail.ts`
- `booking-query-keys.ts`
- `quote-conversion-api.ts`
- `provider-assignment-drawer.tsx`

Avoid:
- `helpers.ts`
- `utils.ts`
- `data.ts`
- `new.tsx`
- `final-hook.ts`
- `misc.ts`

A file name should help a future reader understand:
- what domain it belongs to
- what responsibility it has

---

## Folder nesting rules

Avoid deep nesting without a clear payoff.

Preferred:
- shallow, obvious structure
- consistent patterns across major domains
- enough structure to separate responsibilities without burying files

Avoid:
- deeply nested folders for minor distinctions
- inconsistent structure between domains without reason
- forcing every domain into the exact same folder tree when it does not need it

---

## Forbidden repo patterns

Do not introduce:
- giant generic dumping-ground folders
- duplicated domain hooks in multiple locations
- route files with embedded business logic
- shared helpers that secretly define domain truth
- page-local types that drift from canonical contracts
- mixed-domain API wrappers in random files
- feature code spread across the repo with no clear owner
- “temporary” folders likely to become permanent clutter

---

## Required questions before placing new code

Claude must answer:

1. what domain owns this code?
2. is this domain-specific or truly shared?
3. does this file belong near the route, near the domain, or in infrastructure?
4. would a future reader know where to find this again?
5. does this placement reduce or increase duplication risk?

If these answers are weak, the placement is probably wrong.

---

## Definition of repo-structure success

Nadif’s repo structure is successful when:
- ownership is obvious from file placement
- shared code is genuinely shared
- domain logic is easy to find
- route files stay thin
- duplicate implementations are harder to create
- humans and AI can both extend the codebase without getting lost