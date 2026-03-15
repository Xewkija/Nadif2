# PRD Template

## Purpose of this document

Use this template for meaningful Nadif features, new domains, major rebuilds, or important cross-domain changes.

A PRD is not just a feature description.
It is a decision document that should make the following clear before implementation begins:

- what is being built
- why it matters
- who owns it
- how it fits Nadif canonically
- what the intended UX is
- what backend truth it requires
- how success will be verified

If these answers are weak, the feature is not ready.

---

## 1) Title
A clear, domain-specific feature title.

Example:
- Canonical Quote Lifecycle
- Provider Assignment Command Center
- Services and Pricing Foundation
- Tenant Onboarding and Membership Resolution

---

## 2) Goal
What exactly is this PRD trying to achieve?

This should describe the real product outcome, not just the implementation task.

Good:
- Create a canonical quote lifecycle that allows staff to issue, track, nurture, and convert quotes without shadow booking logic.

Bad:
- Build quotes page.

---

## 3) Why this matters
Why is this important for Nadif right now?

Explain:
- business value
- operational value
- user value
- architectural value
- why now

---

## 4) Problem statement
What is currently broken, missing, duplicated, weak, or unclear?

Answer:
- what exists today?
- what pain or risk does it create?
- why is the current state insufficient?

---

## 5) Personas affected
Who is directly affected?

Examples:
- staff
- customers
- providers
- owners/admins
- dispatchers
- finance/billing staff

For each relevant persona, briefly state:
- what they need
- what this feature improves for them

---

## 6) Primary canonical owner
What is the primary domain owner?

Also list:
- touched secondary domains
- why the primary owner is primary
- what this feature consumes without owning

This section should make ownership obvious.

---

## 7) Slice classification
Classify the work as one of:
- patch
- refactor
- replacement
- rebuild
- new slice

Also state:
- which vertical slice this belongs to
- whether this work unlocks later slices
- whether it depends on earlier slices already being complete

---

## 8) In scope
List what is included in this PRD.

Be concrete.
Scope should name:
- domain behavior
- UX surfaces
- backend behavior
- lifecycle/state handling
- key mutations
- verification expectations if important to the feature

---

## 9) Out of scope
List what is explicitly not included.

This is important so later work is not confused with missing core behavior.

Out-of-scope items should be real exclusions, not hidden core gaps.

---

## 10) Intended user experience
Describe the ideal experience before implementation details.

Include:
- user goal
- primary user flow
- what the user should understand quickly
- what the next action should feel like
- how the surface avoids generic admin UX
- how the feature achieves Nadif’s premium, guided standard

For non-trivial UI, include:
- page archetype
- top-of-page structure
- primary action
- supporting modules
- summary/rail behavior if relevant
- how empty state teaches the user

---

## 11) UI surfaces
List the surfaces in scope.

For each surface, state:
- route or entry point
- page archetype
- primary user
- key actions
- required states

Examples of required states:
- loading
- empty
- error
- success
- disabled
- destructive confirmation

---

## 12) Route(s) and entry points
List:
- route(s)
- navigation entry points
- links from related domains
- whether access is protected
- whether customer/provider entry differs from staff entry

---

## 13) Backend truth
Define the canonical backend owner of truth.

State:
- what tables, RPCs, views, edge functions, or contracts own the feature
- where critical business logic lives
- whether multi-table writes are involved
- whether idempotency matters
- whether audit/event emission is required

This should make it impossible to confuse UI behavior with real ownership.

---

## 14) Read path
How does the data flow from backend truth into the UI?

State:
- source of truth
- adapter/API path
- domain hook/query path
- consuming surfaces

---

## 15) Write path
How do user actions change the system?

State:
- initiating action
- mutation hook or orchestration layer
- adapter/API/RPC/edge function used
- backend truth updated
- audit/event behavior if relevant
- sync/invalidation behavior afterwards

This section should make duplicate write risks obvious.

---

## 16) Data model impact
State:
- new tables/columns/views/functions, if any
- affected existing schema
- lifecycle/state model impact
- tenant ownership model
- RLS implications
- indexing implications
- whether this is a schema change, read-model change, or no schema change

---

## 17) Auth / tenant / RLS impact
Required whenever relevant.

State:
- who can access the feature
- how tenant scope is enforced
- whether membership is required
- whether onboarding/auth flows are affected
- whether policies or protected routes must change

---

## 18) Domain interaction notes
If the feature touches multiple domains, explain:

- primary domain owner
- secondary domains touched
- what is being consumed from those domains
- what is explicitly not being re-owned here

This section exists to prevent shadow systems.

---

## 19) Data freshness / sync expectations
State:
- which surfaces must update after mutation
- required query invalidation/refetch behavior
- whether optimistic updates are used
- whether eventual consistency is acceptable anywhere
- what must never require manual refresh

---

## 20) Acceptance criteria
Write specific, testable acceptance criteria.

They should cover:
- ownership
- product behavior
- backend truth
- UX quality
- state handling
- tenant/auth behavior
- sync behavior

Good examples:
- Quote creation uses the canonical pricing engine rather than page-local calculations.
- Empty services state explains service setup and provides meaningful next actions.
- Successful booking creation updates the intended list/detail surfaces without refresh.
- Protected staff access still requires valid business membership.

Bad examples:
- Looks good
- Works correctly
- Saves data

---

## 21) Verification plan
How will this be proven?

List:
- typecheck expectations
- smoke paths
- mutation paths to exercise
- important failure cases
- auth/tenant checks if relevant
- sync/invalidation checks
- migration or backend verification if relevant

---

## 22) Risks
List meaningful risks such as:
- duplicate ownership
- migration risk
- tenant safety risk
- lifecycle ambiguity
- weak sync behavior
- UI drift toward generic admin patterns
- hidden coupling to legacy flows

Also state how each risk will be managed.

---

## 23) Dependencies
List:
- prior slices required
- backend contracts required
- design system/component dependencies
- operational dependencies
- third-party dependencies if relevant

---

## 24) Rollout / migration notes
If this changes existing behavior, state:
- whether it is patch, refactor, replacement, or rebuild
- whether old surfaces remain temporarily
- what gets deprecated
- whether cleanup is same-PR or follow-up
- whether data migration/backfill is needed

---

## 25) Follow-up items
List true follow-up work only.

Do not hide core incompleteness here.
If something is essential to the feature being real, it belongs in scope.

---

## 26) Definition of success
Describe what success looks like in plain language.

This should answer:
- what is better for the user
- what is better architecturally
- why Nadif is more canonical, premium, or operationally clear after this work

---

## 27) PRD readiness check
Before implementation begins, the PRD should be able to answer:

1. Is the primary owner clear?
2. Is the intended UX clear?
3. Is the backend truth clear?
4. Is the write path canonical?
5. Are tenant/auth implications clear?
6. Are acceptance criteria specific?
7. Are the risks and dependencies honest?
8. Would a developer or AI know exactly what to build without inventing missing rules?

If several answers are weak, the PRD is not ready.