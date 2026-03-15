# Migration Policy

## Purpose of this document

This document defines how Nadif changes existing systems safely.

Its job is to prevent:
- breaking cutovers
- hidden regressions
- duplicate truth surviving too long
- destructive cleanup happening too early
- legacy systems being replaced without proof
- schema and behavior drifting during transitions

This document governs migration and cutover strategy.
It works alongside:
- `03-database-rules.md` for schema design quality
- `05-delivery-workflow.md` for implementation process
- `06-definition-of-done.md` for release quality gates

---

## Core migration principle

Do not replace important product behavior in one blind step.

For meaningful changes, prefer a safe sequence:

1. additive schema or backend support
2. backfill if needed
3. verify data correctness
4. switch reads
5. verify read behavior
6. switch writes
7. verify canonical write behavior
8. remove legacy only after proof

A migration is not complete when the new structure exists.
It is complete when the product is safely using the new canonical path.

---

## Golden rules

- one coherent concern per migration
- name migrations clearly
- include comments for non-obvious changes
- never mix destructive cleanup with unrelated feature work
- do not remove legacy paths before replacement is proven
- do not switch writes before the new owner is ready
- do not leave dual-truth states ambiguous
- keep the transition strategy reviewable

---

## What this policy applies to

Use this policy whenever changing:

- schema ownership
- canonical write paths
- domain source of truth
- lifecycle models
- read models or views used by real product surfaces
- auth/tenant/business membership behavior
- payment, booking, quote, dispatch, or automation truth
- any change that replaces legacy behavior rather than simply adding new behavior

This policy is not just for SQL migrations.
It also applies to behavioral migrations in app/backend architecture.

---

## Migration types

Before making a change, classify it as one of:

### 1) Additive
New schema, new field, new table, new view, or new contract added without replacing an old one yet.

Lowest-risk type, but still requires ownership clarity.

### 2) Transformational
Existing truth is being reshaped, backfilled, normalized, or moved toward a new canonical form.

Requires careful transition planning.

### 3) Cutover
Reads and/or writes are being moved from the old path to the new path.

This is where many real regressions happen.

### 4) Cleanup
Legacy schema, code paths, or adapters are being removed after the new path has already been proven.

Cleanup is never the same thing as cutover.

Claude must identify which type of migration is happening before implementation begins.

---

## Required safe sequence

### Phase 1) Additive foundation
First add what the new system needs:

- new columns
- new tables
- new indexes
- new views
- new RPCs/functions
- new adapters/contracts

Rules:
- additive changes should not silently break current behavior
- new ownership should already be clear before schema is added
- do not add structures with vague future purpose

### Phase 2) Backfill or data preparation
If the new model depends on existing data, define and execute the preparation step.

This may include:
- backfilling new columns
- deriving new normalized state
- copying trusted values into new structures
- building reporting/read models
- repairing inconsistent legacy records if required

Rules:
- backfill logic should be explicit
- backfill assumptions should be documented
- if correctness matters, verify the backfill before cutover

### Phase 3) Switch reads
Move consuming surfaces to read the new canonical truth.

Examples:
- UI reads a new lifecycle field
- dashboard reads from a new reporting view
- booking detail reads new payment truth
- provider surface reads canonical assignment data

Rules:
- switch reads before switching all writes when appropriate
- verify the new read path actually matches expected behavior
- do not present two conflicting truths in different surfaces

### Phase 4) Switch writes
Once the new owner is ready, move mutations to the new canonical path.

Examples:
- form submits call a new RPC
- lifecycle transitions write to the new model
- a detail view stops updating legacy fields
- a webhook writes to the new owner instead of the old one

Rules:
- canonical write path must be explicit
- do not leave ambiguous parallel write ownership
- if temporary dual-write is necessary, it must be documented and time-bounded

### Phase 5) Verify before cleanup
Before removing legacy pieces, verify:

- reads are correct
- writes are correct
- downstream surfaces still work
- audit/event behavior still works if relevant
- sync/invalidation still works
- no critical consumer still depends on the old path

### Phase 6) Cleanup legacy
Only after proof should legacy be removed.

Allowed cleanup:
- old columns
- old tables
- old adapters
- old hooks
- old routes/surfaces
- old read models
- old write paths

Rules:
- cleanup must be intentional
- usage must be proven
- compile and smoke checks must pass
- destructive cleanup should usually be isolated from unrelated work

---

## Read-switch and write-switch rules

### Reads and writes must not drift indefinitely
A temporary mismatch may exist during a controlled transition, but it must be explicit.

Claude must state:
- what is still reading old truth
- what is already reading new truth
- what is still writing old truth
- what is already writing new truth
- when the transition ends

### Prefer one final owner
The goal of migration is not coexistence.
The goal is one canonical owner.

Do not let temporary dual systems become permanent product architecture.

---

## Dual-write policy

Dual-write is allowed only when necessary and explicitly justified.

If dual-write is used, document:
- why it is necessary
- which path is becoming canonical
- how consistency will be checked
- how long dual-write is expected to exist
- what ends dual-write
- when the old write path will be removed

Dual-write is risky because it easily creates hidden drift.
Use it sparingly.

---

## Backfill policy

If a backfill is needed, the plan must state:

- source data used
- transformation logic
- assumptions
- one-time vs repeatable behavior
- verification method
- how partial or failed backfill is handled

Do not assume a backfill is correct just because the script ran.

For important business truth, verify the result.

---

## Risky change checklist

For risky changes, document all of the following:

- old path
- new path
- primary domain owner
- affected secondary domains
- transition strategy
- rollout order
- verification strategy
- rollback strategy
- cleanup plan
- user-visible risk if the cutover fails

Examples of risky changes:
- booking lifecycle model replacement
- payment status source-of-truth change
- auth/business membership resolution change
- quote conversion model change
- dispatch ownership change
- pricing engine migration

---

## Rollback policy

For risky changes, Claude must state how rollback would work.

That does not always mean a full database reversal.
It can also mean:
- reverting reads to old truth
- reverting writes to old path
- disabling a new route/surface
- leaving additive schema in place while behavior rolls back
- stopping a new integration path

A rollback plan should answer:
- what can be safely reverted
- what cannot be safely reverted
- what data might need reconciliation
- what operational risk remains after rollback

Do not treat “we can just fix it later” as rollback planning.

---

## Destructive cleanup policy

Destructive cleanup includes:
- dropping columns
- dropping tables
- removing old RPCs/functions
- deleting old hooks/adapters/routes
- removing legacy read/write branches

Destructive cleanup is allowed only when:
- replacement is already live
- usage has been proven
- verification is complete
- dependent surfaces are known
- rollback implications are understood

Destructive cleanup should not be bundled casually with feature work.

---

## Verification requirements during migration

Migration work must be verified at the correct stage.

### After additive changes
Verify:
- schema exists as intended
- indexes/policies/functions are present
- old behavior still works if it is supposed to

### After backfill
Verify:
- row counts or target coverage where relevant
- transformed values make sense
- no obvious integrity issues were introduced

### After read switch
Verify:
- intended surfaces show correct data
- no conflicting old/new truth remains visible
- empty/loading/error states still behave correctly

### After write switch
Verify:
- mutations hit the new canonical path
- related surfaces stay in sync
- audit/event behavior still fires where needed
- retry behavior does not create obvious duplication issues

### Before cleanup
Verify:
- old path is no longer needed
- imports/usages are known
- smoke checks pass
- follow-up risks are understood

---

## Auth / tenant migration rules

Changes touching auth, tenant context, invites, onboarding, or membership are always high-risk.

Required:
- explicit old path and new path
- protected-route verification
- business-context verification
- no default tenant assumptions
- no weakening of membership gating to make the migration “work”

These migrations must be treated as behavioral cutovers, not ordinary refactors.

---

## UI migration rules

If a migration affects UI surfaces:

- do not leave the UI reading mixed truth without explanation
- do not let old and new surfaces both appear canonical
- do not remove recovery or guidance states during transition
- verify sync/invalidation after switching writes
- keep the user-facing experience coherent during the change

A migration is not successful if the backend is “more correct” but the UI becomes confusing or stale.

---

## Forbidden migration patterns

Do not:
- mix unrelated concerns in one migration
- drop legacy structures before proving replacement
- leave dual writes undocumented
- switch writes before the new backend truth is ready
- rely on manual memory to finish a cutover later
- combine destructive cleanup with large new feature work
- present partial cutover as final completion
- hide risky behavior changes inside “refactor” language
- skip rollback thinking on high-risk transitions

---

## Required migration plan before implementation

For meaningful migration work, Claude must state:

1. migration type
2. primary domain owner
3. old path
4. new path
5. additive changes required
6. backfill required or not
7. read-switch plan
8. write-switch plan
9. verification plan
10. rollback plan
11. cleanup plan
12. risks

If these are weak, the migration is not ready.

---

## Required migration summary after implementation

After migration work, Claude must state:

1. what changed
2. what is now canonical
3. whether reads were switched
4. whether writes were switched
5. whether any dual-write or temporary legacy remains
6. what was cleaned up
7. what verification was performed
8. what follow-up remains

This is required so the repo does not accumulate half-finished transitions.

---

## Definition of migration success

A Nadif migration is successful when:
- the new canonical owner is clear
- transition steps were intentional
- reads and writes safely converge on one truth
- legacy is removed only after proof
- rollback thinking existed before risk was taken
- the system is more canonical after the change than before it