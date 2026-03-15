# CLAUDE.md

We are rebuilding Nadif into a premium, multi-tenant operating system for cleaning businesses.

Nadif must feel calm, refined, guided, and operationally powerful.
The goal is not generic admin software.
The goal is a canonical, production-grade product that feels world-class across staff, customer, and provider surfaces.

---

## Purpose of this file

This file is the top-level AI operating contract for the Nadif repo.

It defines:
- how Claude should behave
- which docs take precedence
- which docs to consult for which decisions
- what must happen before coding
- what patterns are forbidden
- when Claude must stop and resolve ambiguity before proceeding

This file is not the full product spec.
It is the enforcement and routing layer for the rest of the docs.

---

## Documentation precedence

When docs conflict, use this order:

1. `CLAUDE.md`
2. `00-project-vision.md`
3. `01-canonical-domains.md`
4. `02-system-architecture.md`
5. `03-database-rules.md`
6. `04-ui-ux-rules.md`
7. `05-delivery-workflow.md`
8. `06-definition-of-done.md`
9. `07-prd-template.md`
10. `08-feature-build-template.md`
11. `09-migration-policy.md`
12. `10-repo-structure.md`
13. `11-vertical-slice-order.md`

Templates and support docs never override core rules.

---

## Which doc to consult

Claude must route decisions to the correct document instead of improvising.

Use:

- `00-project-vision.md` for product direction, principles, and tradeoff intent
- `01-canonical-domains.md` for primary ownership, source of truth, and write-path decisions
- `02-system-architecture.md` for layer boundaries, RPC vs edge-function choices, and read/write flow
- `03-database-rules.md` for schema design, RLS, lifecycle modeling, auditability, and idempotency
- `04-ui-ux-rules.md` for page anatomy, layout, color direction, empty states, hand-holding, and premium UX quality
- `05-delivery-workflow.md` for audit-before-change, planning sequence, implementation order, cleanup rules, and verification flow
- `06-definition-of-done.md` for the final release gate
- `07-prd-template.md` for major feature planning
- `08-feature-build-template.md` for implementation-ready build briefs
- `09-migration-policy.md` for additive changes, read/write cutovers, backfills, cleanup, and rollback thinking
- `10-repo-structure.md` for file placement and shared-vs-domain code decisions
- `11-vertical-slice-order.md` for rebuild sequencing and slice unlock rules

If a decision belongs to one of these docs, Claude must use that doc rather than making up a local rule.

---

## Product standard

Nadif must feel:
- premium
- calm
- refined
- warm
- spacious
- trustworthy
- guided
- operationally clear
- simple on the surface, powerful underneath

Nadif must not feel:
- generic admin template
- black-and-white default SaaS
- bootstrap-like
- dull
- empty
- cold
- cramped
- developer-first
- placeholder-ish
- overly card-heavy
- visually flat
- form-dump heavy
- like the same page repeated with different labels

---

## Core operating rules

### 1) Multi-tenant safety is non-negotiable
Every feature must be tenant-safe by design.

Never add logic that can leak, mix, or infer data across tenants.

Required:
- tenant-scoped queries
- tenant-aware query keys
- tenant-aware routes where relevant
- tenant-safe RPC design
- tenant-safe audit/event ownership
- RLS-compatible behavior

### 2) Canonical ownership is non-negotiable
Every important domain must have one clear owner.

Do not create:
- duplicate flows
- duplicate settings surfaces
- shadow systems
- secondary write paths without explicit justification
- client-side truth that bypasses canonical backend ownership

If ownership is unclear, stop and resolve ownership before coding.

### 3) Backend truth over client guesswork
Critical business rules must live in canonical backend systems.

The UI should reflect truth, not invent it.

### 4) No fake production behavior
Do not leave mock data, fake success states, fake API behavior, fake tenant config, or fake production flows in real product paths.

### 5) Premium UX is a product requirement
UI quality is part of product correctness.

Claude must not ship a technically functional surface that feels unfinished, generic, or visually weak.

### 6) Hand-holding is a product requirement
Nadif should guide users through setup, operations, and recovery.
The interface must not assume prior product knowledge.

### 7) No dead-end first-use experiences
A first-time user should never land on a blank operational page with no context, no guidance, and no meaningful next step.

---

## Mandatory execution rule

For all non-trivial work, Claude must not jump straight into coding.

Claude must first:
1. audit the current state
2. identify the primary canonical owner
3. determine which docs govern the decision
4. define the intended UX if UI is involved
5. define the backend truth and write path
6. define acceptance criteria
7. then implement in the correct sequence

If this is not clear, implementation should not begin.

---

## Mandatory UI rule

For all non-trivial UI work, Claude must design before coding.

Before implementation, Claude must define:
1. page archetype
2. user goal on that surface
3. top-of-page structure
4. primary action
5. supporting modules
6. empty/loading/error/success states
7. mobile behavior where relevant
8. why the design meets Nadif’s premium standard

Do not jump straight into component assembly.

Claude must follow `04-ui-ux-rules.md` for the concrete design standard.

---

## Required page archetype selection

Every non-trivial page must explicitly choose one of these archetypes before implementation:

- dashboard
- collection/index page
- command center/detail page
- setup/settings page
- multi-step flow/wizard
- customer transactional flow
- provider operational flow

Claude must not build pages as generic catch-all admin shells.

---

## Hard bans for UI output

Claude must not ship:
- title + button + centered empty state in a giant blank canvas
- black primary buttons or black active nav pills as the default Nadif visual language
- narrow content columns floating inside wide empty screens
- repeated page templates with only the nouns swapped out
- giant undifferentiated card grids
- plain CRUD forms passed off as premium setup experiences
- settings walls with weak grouping
- pages with no contextual guidance
- dead-end empty states with only one vague action
- generic “clean” layouts that still feel emotionally flat or unfinished

---

## Operational UX rule

Foundational staff pages must still feel useful even when empty.

When there is no data yet, the page should still provide:
- context
- explanation
- guidance
- setup progress
- starter actions
- optional secondary actions
- confidence about what happens next

An empty page is still a designed experience.

---

## Required planning output before coding

For non-trivial work, Claude must state:

1. goal
2. change classification (`patch`, `refactor`, `replacement`, `rebuild`, or `new slice`)
3. primary canonical owner
4. touched secondary domains
5. page archetype if UI is involved
6. user journey on the surface if UI is involved
7. files likely affected
8. backend surfaces involved
9. auth / tenant / RLS impact
10. duplication / regression risk
11. acceptance criteria

Then implement.

---

## Stop conditions

Claude must stop and resolve before coding if:
- primary ownership is unclear
- source of truth is unclear
- the current implementation has not been audited
- the change would introduce a parallel write path
- tenant/auth/RLS impact is unknown
- the UI direction is still generic
- acceptance criteria are weak
- the requested work conflicts with the vertical slice order without justification

---

## Required verification after coding

Claude must not say “done” unless it includes:

1. files changed
2. what was added / edited / removed
3. typecheck result
4. route / surface smoke result
5. data freshness / invalidation behavior
6. canonical write-path confirmation
7. auth / tenant verification if relevant
8. known gaps or follow-ups

Compiling is necessary but not sufficient.

Claude must follow `06-definition-of-done.md` as the final quality gate.

---

## Forbidden behaviors

Do not:
- improvise ownership
- skip audit because the request sounds small
- build disconnected shells and call them progress
- leave duplicate logic in place without naming the risk
- use client-side logic as a shortcut around canonical backend truth
- weaken tenant or membership protections to make a flow appear to work
- treat visually cleaner UI as sufficient if the structure is still generic
- remove legacy code before replacement is proven safe
- claim completion without verification

---

## Definition of success

Success means:
- canonical ownership is clear
- multi-tenant safety is preserved
- backend truth is preserved
- the UX is premium and guided
- foundational pages do not feel empty or generic
- the product feels more coherent after the change than before it