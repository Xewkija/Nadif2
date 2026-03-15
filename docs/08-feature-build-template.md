# Feature Build Template

## Purpose of this document

Use this template for implementation-ready Nadif work.

This is not the same as a PRD.

A PRD explains the product decision.
This document explains the concrete build plan for a specific feature, slice, fix, refactor, or replacement.

It should make implementation safer by forcing clarity around:
- ownership
- existing truth
- UX intent
- backend path
- sync behavior
- verification
- cleanup risk

If these sections are weak, the feature is not ready to build.

---

## 1) Feature
Name the feature clearly.

Examples:
- Services Empty State Upgrade
- Canonical Quote Conversion Flow
- Booking Command Center Payment Status Fix
- Tenant Onboarding Membership Resolver

---

## 2) Change classification
Classify the work as one of:
- patch
- refactor
- replacement
- rebuild
- new slice

Also state:
- why this classification fits
- whether this changes existing behavior or mainly improves correctness/quality

---

## 3) Goal
What should be true after this work is complete?

Describe the outcome, not just the coding task.

Good:
- Staff can configure services through a premium, guided setup surface backed by the canonical services domain.

Bad:
- Update services page UI.

---

## 4) Primary domain owner
State:
- primary canonical owner
- touched secondary domains
- why the primary owner is primary

This should make it obvious what domain owns the truth.

---

## 5) User / operator outcome
Who benefits from this change, and what gets better for them?

Examples:
- staff can understand what to do on first visit
- customers see clearer pricing expectations
- dispatchers can assign providers without shadow workflows

---

## 6) Surfaces affected
List the surfaces in scope.

For each surface, include:
- route or entry point
- page archetype
- primary actions
- required states

Example:
- `/app/services` — collection/setup page — create service, edit service, understand setup progress
- service detail drawer — focused editing surface — save, cancel, validate

---

## 7) Intended UX
Describe the intended experience before implementation.

Include:
- what the user should understand immediately
- what the next action is
- what supporting context/modules should exist
- how the page avoids generic admin UI
- how empty/loading/error/success states should feel

For non-trivial work, include:
- top band structure
- summary rail or side panel if relevant
- step flow if relevant
- hand-holding elements

---

## 8) Existing canonical logic
Audit what already exists.

State:
- current source of truth
- current write path
- current read consumers
- existing routes/components/hooks/adapters/RPCs involved
- what should be preserved
- what is weak, duplicated, or incorrect

This section should prevent blind patching.

---

## 9) Read path
How will data flow into the surface?

State:
- source of truth
- adapter/API module
- domain hook/query
- consuming UI surfaces

---

## 10) Write path
How will user actions mutate the system?

State:
- initiating action
- mutation hook
- API/RPC/edge function path
- backend truth updated
- audit/event behavior if relevant
- sync/invalidation afterwards

---

## 11) Backend surfaces involved
List all relevant backend surfaces:

- tables
- views
- RPCs
- edge functions
- storage/attachments if relevant
- policy/RLS impact if relevant

This section should make backend ownership explicit.

---

## 12) Files likely affected
List likely files by area:

- routes/pages
- domain components
- hooks
- adapters/API files
- types
- state
- migrations
- functions
- docs

This helps show scope before implementation expands.

---

## 13) Data model / migration impact
State:
- whether migrations are needed
- new/changed tables/columns/views/functions
- lifecycle/status impact
- indexing impact
- backfill or rollout concerns if relevant

If no migration is needed, say so explicitly.

---

## 14) Auth / tenant / RLS impact
State:
- who can access the surface
- whether business membership is required
- how tenant scope is enforced
- whether route protection changes
- whether policies are affected

If none, say:
- no auth/tenant/RLS change expected

---

## 15) Query keys / sync plan
List:
- query keys read by this feature
- mutation invalidation targets
- optimistic update behavior if any
- related surfaces that must stay in sync

This section should make “works after refresh” unacceptable.

---

## 16) Risks of duplication
Identify possible duplication risk such as:
- second write surface
- page-local business logic
- shadow lifecycle handling
- duplicate adapters
- duplicate UI patterns pretending to own the same domain

Also state how each risk will be avoided.

---

## 17) Risks / regressions
List likely risks:

- ownership drift
- stale UI after mutation
- tenant/auth regression
- hidden dependency on legacy code
- migration risk
- weak state coverage
- generic UI regression

State how each will be checked or mitigated.

---

## 18) Cleanup / deprecation plan
If this replaces or supersedes anything, state:
- what becomes legacy
- whether old code stays temporarily
- what can be removed now
- what must wait until usage is proven
- whether follow-up cleanup is required

Do not leave this implied.

---

## 19) Step-by-step implementation plan
List the implementation order.

Preferred structure:
1. confirm ownership and audit
2. add/update schema or backend contracts if needed
3. implement canonical backend logic
4. add/update adapters
5. add/update query/mutation hooks
6. build/update route and surface structure
7. implement states and UX polish
8. add sync/invalidation behavior
9. verify
10. clean up replaced code if proven safe

This should be detailed enough that execution does not require inventing missing steps.

---

## 20) Acceptance criteria
List specific criteria for this feature.

These should cover:
- ownership
- backend truth
- UX quality
- states
- sync behavior
- auth/tenant behavior where relevant

Good examples:
- Services page no longer renders as a blank empty shell and instead teaches setup with clear next actions.
- Service creation uses the canonical services write path.
- After saving a service, the services list updates without refresh.
- No black default CTA styling remains on this surface.

---

## 21) Verification checklist
List exactly what will be checked.

Typical items:
- typecheck
- build result if applicable
- route/surface smoke test
- canonical mutation path exercised
- loading/empty/error/success states reviewed
- sync/invalidation verified
- auth/tenant behavior verified if relevant
- migration result verified if relevant
- known gaps documented

---

## 22) Done summary format
When finished, report:
- goal achieved
- primary owner confirmed
- files changed
- what was added / edited / removed
- backend surfaces changed
- migration impact
- verification results
- remaining gaps or follow-ups

---

## 23) Build-readiness check
Before implementation starts, this template should be able to answer:

1. Is the owner clear?
2. Is the current truth audited?
3. Is the UX intent clear?
4. Is the read path clear?
5. Is the write path canonical?
6. Is the sync plan clear?
7. Are duplication risks named?
8. Is verification concrete?

If several answers are weak, the feature is not ready to build.