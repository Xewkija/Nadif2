# Delivery Workflow

## Purpose of this document

This document defines how Nadif work must be delivered.

Its job is to prevent:
- blind patching
- duplicate ownership
- disconnected UI shells
- backend drift
- unsafe cleanup
- features that compile but are not actually product-ready

This is the required workflow for significant product, architecture, backend, and UX work.

The goal is not just to ship code.
The goal is to ship canonical, verified, premium slices.

---

## Core delivery principle

Do not jump from request to code.

For any non-trivial work, the required order is:

1. audit current state
2. identify canonical ownership
3. define the target slice
4. define the intended UX
5. define backend truth and write path
6. define acceptance criteria
7. implement in the correct sequence
8. verify thoroughly
9. document what changed and what remains

If ownership is unclear, implementation should not begin.

---

## Required workflow phases

## Phase 1) Audit current state
Before modifying an existing domain, Claude must inspect and state:

- current route(s)
- current UI surface(s)
- current hooks/state modules
- current API/adapters/RPCs
- current tables/views/functions involved
- current source of truth
- known duplication or drift risks
- what should be preserved
- what should be replaced
- what should be deleted later, if proven safe

Rules:
- do not blindly patch
- do not assume the visible screen is the canonical owner
- do not rebuild on top of unknown existing logic

### Audit output must answer
1. what exists now?
2. what currently owns the domain?
3. where is the truth today?
4. what is broken, duplicated, weak, or missing?
5. what is the smallest correct path forward?

---

## Phase 2) Identify canonical ownership
Before implementation, Claude must state:

- primary domain owner
- touched secondary domains
- source of truth
- canonical write path
- primary UI owner
- duplication risk

Rules:
- every significant change must have one primary owner
- reads do not imply ownership
- convenience surfaces do not become domain owners
- if this change creates a second write surface, that must be explicitly justified

If this is not clear, stop and resolve it first.

---

## Phase 3) Define the slice
Claude must define the exact slice being shipped.

A slice should be meaningful and end-to-end, not a disconnected shell.

A valid slice usually includes:
- data truth
- read path
- write path
- UI surface
- state handling
- loading/empty/error/success states
- sync/invalidation behavior
- tenant/auth correctness
- audit/event behavior where relevant

Avoid:
- UI-only slices with no real backend truth
- backend-only slices with no usable surface
- placeholder surfaces waiting for future logic

---

## Phase 4) Define the intended UX before coding
For any non-trivial surface, Claude must define:

- page archetype
- user goal
- top-of-page structure
- primary action
- supporting modules
- empty state behavior
- loading/error/success behavior
- mobile behavior where relevant
- why the design matches Nadif’s premium standard

Rules:
- do not jump straight into fields and components
- do not ship title + button + blank empty state pages
- do not treat “clean” as sufficient if the page still feels generic

---

## Phase 5) Define backend truth and implementation path
Before coding, Claude must identify:

- whether the truth belongs in schema, RPC, adapter, edge function, hook, or UI
- which backend contracts are required
- what tables/functions are touched
- what RLS/tenant implications exist
- whether audit/event emission is required
- whether idempotency matters
- how data freshness will work after mutation

Rules:
- critical business truth belongs in canonical backend systems
- UI must not become a shadow owner
- if multiple tables change together, prefer canonical backend ownership
- if an external system is involved, define whether edge-function orchestration is needed

---

## Phase 6) Define acceptance criteria
Before implementation, acceptance criteria must be explicit.

Acceptance criteria should cover:

- product behavior
- domain ownership
- backend truth
- tenant safety
- UX quality
- sync/freshness
- state handling
- verification expectations

Good acceptance criteria are specific enough that failure is obvious.

Bad acceptance criteria:
- “page works”
- “form saves”
- “looks cleaner”

Good acceptance criteria:
- “booking creation uses canonical pricing engine rather than page-local calculations”
- “empty services page teaches setup and provides meaningful next actions”
- “successful customer creation updates list and counters without refresh”
- “protected route still requires valid business membership after onboarding change”

---

## Phase 7) Implement in the correct order
Preferred implementation order:

1. schema / backend contracts if needed
2. canonical RPC or backend logic
3. adapters
4. domain hooks / query keys / mutations
5. route and page composition
6. UI components and states
7. audit/sync/invalidation handling
8. cleanup of replaced code, only if proven safe

Rules:
- do not start from decorative UI if the data model is unclear
- do not patch UI around missing backend truth
- do not delete existing logic before replacement is proven
- do not leave temporary shadow systems unless explicitly documented and time-bounded

---

## Phase 8) Verify
Claude must verify more than compilation.

Required verification should include, as relevant:

- typecheck result
- route/surface smoke result
- canonical write path result
- loading/empty/error/success states
- auth/tenant behavior
- sync/invalidation behavior
- audit/event behavior
- migration/result checks if backend changed
- known limitations or follow-up items

### Minimum verification proof
Every meaningful change should include:

1. files changed
2. what was added / edited / removed
3. typecheck result
4. smoke result
5. ownership confirmation
6. sync/invalidation confirmation
7. tenant/auth confirmation if relevant
8. known gaps

### Additional required verification for auth/tenant work
For auth, membership, invite, onboarding, or protected-route changes, verify:

- sign-up works
- sign-in works
- business context resolves correctly
- protected routes stay protected
- onboarding path is not dead-ended
- tenant isolation still holds

### Additional required verification for mutation-heavy flows
For create/edit/convert/cancel/pay/assign flows, verify:

- canonical mutation path is used
- related lists/details/states update correctly
- duplicates are not created under normal retry behavior
- success and failure are both visible and understandable

---

## Phase 9) Document what changed
After implementation, Claude must state:

- goal of the change
- canonical owner
- files changed
- backend surfaces changed
- migrations added, if any
- what was replaced
- what remains for later
- risks or follow-ups

This is required so future work can build from truth rather than re-auditing everything from scratch.

---

## Pull request expectations

Every PR must clearly state:

- problem
- why this matters
- scope
- primary canonical owner
- touched secondary domains
- UX impact
- backend impact
- migration impact
- verification proof
- risks
- follow-up items if not fully complete

PRs should make it easy to answer:
- what changed?
- why here?
- why this owner?
- how was it verified?
- what did we avoid duplicating?

---

## Refactor vs rebuild rule

Before making major changes, Claude should classify the work as one of:

- patch
- refactor
- replacement
- rebuild

### Patch
Use when:
- ownership is already correct
- issue is narrow
- no structural drift is introduced

### Refactor
Use when:
- ownership remains the same
- implementation quality improves
- external behavior mostly stays stable

### Replacement
Use when:
- an old implementation is being superseded by a better canonical one
- migration path is understood
- cleanup will follow after proof

### Rebuild
Use when:
- current structure is fundamentally wrong
- ownership is unclear or duplicated
- UX or backend truth needs new canonical architecture

Claude must not treat rebuild work like a quick patch.

---

## Cleanup and deletion rules

Claude must not delete code, files, routes, exports, or migrations unless all are true:

- replacement is identified
- usage is proven
- ownership of the replacement is clear
- route/surface impact is understood
- compile/smoke verification is complete
- deletion does not create hidden regressions

Allowed:
- staged deprecation
- follow-up cleanup plan
- explicit TODOs tied to a replacement path

Not allowed:
- casual deletion during a feature pass
- “probably unused” cleanup
- removing old logic before the new canonical path is verified

---

## AI-assisted work rules

Claude may draft quickly, but speed is not proof.

No AI-assisted change is valid without:
- ownership clarity
- architectural clarity
- UI intent clarity
- verification proof
- duplication awareness
- tenant/auth safety where relevant

Claude must not:
- improvise domain ownership
- silently invent contracts
- skip audit because the request sounds simple
- treat visually cleaner UI as a sufficient product fix
- claim completion without verification

---

## Stop conditions

Claude must stop and resolve before coding if:

- primary owner is unclear
- source of truth is unclear
- current implementation has not been audited
- requested change conflicts with canonical rules
- the work would introduce a parallel write path
- RLS/tenant impact is unknown
- UI direction is still generic or undefined
- acceptance criteria are weak

---

## Definition of delivery success

Delivery is successful when:
- the correct domain owns the change
- the slice is end-to-end and real
- backend truth is preserved
- UX is intentional and premium
- verification proves the change actually works
- cleanup does not create regressions
- the codebase is easier to reason about after the work