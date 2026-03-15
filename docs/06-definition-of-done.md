# Definition of Done

## Purpose of this document

This document defines the final quality gate for Nadif work.

A feature is not done because it compiles.
A feature is not done because it renders.
A feature is not done because one happy path works.

A feature is only done when it is:
- canonically owned
- structurally correct
- tenant-safe
- operationally usable
- visually intentional
- verified beyond the happy path

This document is the final gate after planning, architecture, database, and workflow rules have already been followed.

---

## Core rule

A Nadif feature is only done when all relevant categories below are satisfied:

1. ownership is clear
2. backend truth is canonical
3. UI/UX meets Nadif quality bar
4. state handling is complete
5. data freshness works correctly
6. tenant/auth/security expectations still hold
7. verification proof exists
8. follow-up items are explicitly named if anything remains out of scope

If several of these are weak, the feature is not done.

---

## Done categories

## 1) Ownership and scope are done when
- primary canonical owner is clear
- touched secondary domains are clear
- the change does not create accidental duplicate ownership
- the chosen write path is canonical
- any inline editing still uses the canonical write path
- scope matches the intended slice rather than drifting into random extra work

Not done if:
- ownership is ambiguous
- the page behaves like it owns a domain it only reads
- a second write surface was introduced without explicit justification
- the feature works only by bypassing canonical ownership rules

---

## 2) Backend truth is done when
- the required backend contract exists
- the UI is wired to the real backend path
- critical business logic lives in the correct backend layer
- multi-table or lifecycle-sensitive writes are handled canonically
- no mock production behavior remains in real product paths
- audit/event behavior exists where the domain requires it
- idempotency/retry safety is handled where the domain requires it

Not done if:
- the UI simulates backend truth
- calculations live in page components when they belong in backend logic
- fake success states remain
- important writes bypass canonical backend ownership
- retrying can easily create duplicate or inconsistent records

---

## 3) Database and schema work is done when
- schema changes are delivered through migrations
- new tables/columns clearly belong to a domain
- tenant ownership is explicit where applicable
- lifecycle/status meaning is explicit
- foreign keys and indexes are appropriate
- RLS expectations are understood and compatible with actual usage

Not done if:
- schema drift is manual or undocumented
- tenant ownership is fuzzy
- lifecycle meaning is hidden in vague fields
- schema shortcuts make ownership harder to reason about
- policies and query behavior do not actually match

---

## 4) UI / UX is done when
- the surface feels intentional, premium, and domain-specific
- the page does not look like a generic admin template
- desktop width is used intelligently
- the next action is obvious
- the page teaches the user what matters
- complex flows are guided rather than dumped into raw forms
- empty states are useful, not decorative placeholders
- hierarchy, spacing, and action emphasis are strong
- the visual language matches Nadif’s calm, premium standard

Not done if:
- it is title + button + blank empty state
- it feels dull, cold, or generic
- the page is technically clean but emotionally flat
- black default SaaS styling is doing all the work
- the surface looks interchangeable with other domains
- the UX assumes the user already understands the system

---

## 5) State handling is done when
- loading state exists
- empty state exists
- error state exists
- success feedback exists
- disabled states exist where relevant
- destructive actions have proper confirmation
- missing setup has a clear recovery path
- no dead-end user states remain

Not done if:
- only the populated happy state was designed
- failure states collapse into generic errors
- users can get stranded
- destructive actions are easy to trigger without clarity
- disabled controls give no useful explanation when needed

---

## 6) Data freshness and sync are done when
- successful mutations update affected surfaces correctly
- related lists, detail views, counters, badges, and summaries stay in sync
- query invalidation/refetch behavior is explicit
- optimistic updates are used only where rollback is clear
- the feature does not depend on manual browser refresh

Not done if:
- it only looks correct after refresh
- detail drawers stay stale after save
- counts or status chips do not update
- route navigation is hiding missing synchronization
- success toasts appear but visible state stays wrong

---

## 7) Tenant, auth, and access behavior are done when
- tenant safety is preserved
- protected access rules still work
- business membership remains the real gate where relevant
- auth flow and business context still resolve correctly
- no fallback/default tenant assumptions were introduced
- route behavior matches actual access policy behavior

Not done if:
- the feature works by weakening route protection
- auth success is treated as full onboarding success when it is not
- tenant scope is assumed instead of resolved
- policy behavior and UI behavior disagree

---

## 8) Verification is done when
- typecheck passes
- build passes if applicable to the workflow
- critical smoke test passes
- route/surface verification was performed
- canonical write path was exercised
- important states were checked, not just the happy path
- known risks and remaining gaps are explicitly listed

Not done if:
- the proof is only “it compiles”
- the proof is only “it renders”
- only one success case was tested
- the change was not exercised on the actual intended surface
- verification ignores auth, tenant, sync, or failure states where relevant

---

## Done expectations by change type

## UI-heavy changes
A UI-heavy feature is not done unless:
- the page meets Nadif’s premium standard
- hierarchy and action clarity are strong
- empty/loading/error/success states are designed
- the page does not feel generic or incomplete
- the intended user flow is obvious within seconds

## Backend-heavy changes
A backend-heavy feature is not done unless:
- canonical ownership is clear
- the write path is correct
- idempotency/consistency is handled where needed
- audit/event behavior exists where required
- the UI actually consumes the new truth correctly if a surface is in scope

## Auth / tenant / onboarding changes
These are not done unless:
- sign-up/sign-in flows still work
- business context resolves correctly
- onboarding is not dead-ended
- protected routes stay protected
- tenant isolation still holds

## Mutation-heavy operational changes
These are not done unless:
- create/edit/cancel/assign/pay actions use canonical writes
- success and failure are both visible
- related surfaces sync correctly
- duplicate writes are not easily introduced by retry or re-entry

---

## Explicitly not enough

These alone do not mean done:

- it compiles
- it renders
- it looks close
- the happy path works once
- the page is cleaner than before
- the backend contract exists somewhere
- a toast appears
- the main form submits
- the list page loads
- Claude says it should work
- the code is shorter
- the feature is “good enough for now”

---

## Automatic failure conditions

The work is not done if any of these are true:

- canonical ownership is still unclear
- duplicate write paths were introduced
- UI depends on mock production behavior
- backend truth is partially simulated in the client
- the page still feels generic or empty
- a manual refresh is required to see correct state
- tenant/auth behavior is weakened
- important states were not checked
- follow-up gaps are hiding core incompleteness rather than true future enhancements

---

## Required completion summary

Before calling work done, Claude must provide:

1. goal of the change
2. primary canonical owner
3. files changed
4. what was added / edited / removed
5. backend surfaces changed
6. migration impact
7. verification proof
8. sync/freshness result
9. tenant/auth result if relevant
10. known gaps or follow-ups

If this summary is weak, the work is not ready to be called done.

---

## Definition of Nadif-quality done

A Nadif feature is truly done when:
- the right domain owns it
- the backend truth is real
- the UI feels premium and guided
- important states are complete
- related surfaces stay in sync
- tenant/access integrity still holds
- verification gives confidence beyond the happy path
- the product feels more coherent after the change than before it