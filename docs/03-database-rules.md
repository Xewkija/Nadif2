# Database Rules

## Purpose of this document

This document defines Nadif’s database truth rules.

Its job is to ensure the backend remains:
- canonical
- tenant-safe
- auditable
- explicit
- structurally understandable as the product grows

This document governs:
- schema design
- table ownership
- relational integrity
- lifecycle/state modeling
- RLS expectations
- audit/idempotency expectations

This document does not replace `09-migration-policy.md`.
That doc governs rollout and migration strategy.
This doc governs how the data model itself should be designed.

---

## Core database standard

The database is not just persistence.
It is a core part of Nadif’s product correctness.

The schema must make it hard to create:
- duplicate truths
- vague ownership
- tenant leakage
- lifecycle ambiguity
- inconsistent writes
- untraceable changes
- “temporary” shortcut models that become permanent

Every meaningful table must have:
- clear domain ownership
- clear tenant ownership where applicable
- explicit relational links
- explicit lifecycle meaning
- explicit write expectations
- clear RLS expectations
- index strategy appropriate to how it is queried

---

## Global rules

### 1) Every schema change goes through migrations
- no manual production schema edits
- no silent production-only drift
- schema history must remain reviewable

### 2) Every persistent model needs a domain owner
Before adding a table, Claude must identify:
- primary domain owner
- why this data belongs to that domain
- whether the new structure creates duplication risk

### 3) Tenant safety is non-negotiable
Any table representing tenant-owned business data must be tenant-safe by design.

Required where applicable:
- explicit tenant/business ownership column
- tenant-safe foreign key paths
- tenant-safe indexes
- RLS-compatible access patterns

Do not rely on “the app will filter it correctly” as the main protection model.

### 4) Lifecycle truth must be explicit
If a record has lifecycle meaning, its state model must be explicit.

Do not hide lifecycle truth in:
- vague booleans
- overloaded timestamps
- implicit null meaning
- scattered derived UI assumptions

### 5) Relational truth beats convenience
Use explicit foreign keys and relational design unless there is a strong documented reason not to.

### 6) Auditability matters
Important operational mutations should be traceable.
If a flow matters to the business, its changes should not disappear into silent writes.

### 7) The schema must stay understandable
Do not add structures that technically work but make ownership, lifecycle, or query behavior hard to reason about.

---

## Required standards for major tables

Every major table should explicitly define:

- primary key
- domain owner
- tenant/business ownership model
- lifecycle/status model if applicable
- created_at
- updated_at if mutable
- soft delete behavior if applicable
- foreign keys
- indexing strategy
- RLS expectations
- audit/event expectations where relevant

### Primary keys
Required:
- explicit primary key on every persistent table
- key type should be consistent with repo/database conventions
- avoid hidden identity assumptions

### Foreign keys
Required:
- explicit foreign keys for relational ownership
- foreign keys should reflect real domain relationships
- use nullable foreign keys only when the null state is intentional and documented

Avoid:
- storing related ids with no FK when relational truth matters
- loose “reference only” columns that bypass integrity for convenience

### Timestamps
Required:
- `created_at` on major persistent tables
- `updated_at` on mutable records
- additional timestamps only when their business meaning is explicit

Avoid:
- using timestamps as vague proxy statuses
- timestamp fields whose lifecycle meaning is undocumented

---

## Tenant safety rules

### Tenant ownership
Any tenant-owned business record should clearly indicate how it belongs to a business.

Preferred pattern:
- direct `business_id` / tenant id on tenant-owned tables where practical
- or a clearly justified relational ownership model if direct tenant column is intentionally omitted

Claude must be able to explain:
- how tenant scoping works for this table
- how tenant-safe reads happen
- how tenant-safe writes happen
- how RLS will be enforced

### No cross-tenant ambiguity
Avoid schemas where tenant ownership is only inferable through long indirect chains unless that is truly necessary and documented.

### Tenant-safe indexes
Indexes should support the real tenant-scoped access patterns.
Do not create major tables that are always queried by tenant but not indexed accordingly.

---

## Lifecycle and status rules

### Statuses must be explicit
If a domain has lifecycle states, document the canonical state model.

Examples:
- quote lifecycle
- booking lifecycle
- payment lifecycle
- dispatch lifecycle
- automation enrollment state

Required:
- explicit status column or equivalent canonical lifecycle model
- allowed transitions understood by the owning domain
- no conflicting duplicate status models on the same record unless intentionally documented

### Avoid vague booleans
Do not use pairs like:
- `is_active`
- `is_complete`
- `is_paid`
- `is_deleted`

as the only lifecycle model when the domain is more complex than a simple binary state.

### Avoid null as hidden business logic
Do not make business meaning depend on undocumented null interpretation.

If null means something important, that meaning must be documented and intentional.

---

## Table design decision rules

Before adding a new structure, answer:

1. what domain owns it?
2. what business truth does it represent?
3. what lifecycle does it represent, if any?
4. what surfaces read it?
5. what writes it canonically?
6. should this be a table, column, enum/status field, join table, ledger row, materialized view, or ordinary view?
7. what RLS rules apply?
8. what indexes are needed?
9. does this create duplicate ownership risk?

### Use a table when
- the thing has its own identity
- it has its own lifecycle
- it is queried independently
- it has many-to-one or many-to-many relationships
- it needs auditability or history
- it will grow in fields/behavior over time

### Use a column when
- the value is truly part of the parent record’s core truth
- it does not need independent lifecycle/history
- it is not reused as a separate entity

### Use a join table when
- the relationship itself matters
- many-to-many membership/association is real
- the relationship may carry metadata of its own

### Use a view when
- you need a trusted read model
- the underlying truth already exists elsewhere
- the view reduces repeated query logic without becoming a shadow write model

### Be careful with JSON
JSON should not become a dumping ground for domain truth that really needs relational structure.

Allowed:
- bounded metadata
- integration payload snapshots
- flexible but non-canonical adjunct data

Not allowed:
- hiding major relational truth in JSON to avoid proper modeling
- lifecycle-critical state stored only in unstructured blobs

---

## Soft delete rules

Soft delete is allowed only when the domain actually needs recoverability, history preservation, or referential stability.

Required when used:
- explicit soft delete strategy
- documented meaning of deleted state
- query behavior defined
- audit expectations defined
- index/query implications considered

Avoid:
- soft delete by habit
- mixing soft-deleted and active records without intentional filtering rules
- using soft delete as a substitute for real lifecycle modeling

---

## Audit and activity rules

Important operational flows should log activity through canonical event/audit mechanisms.

Audit-critical domains usually include:
- bookings
- quotes
- payments
- provider assignment
- customer lifecycle milestones
- key configuration changes
- approval / refund / cancellation actions

Rules:
- do not rely on UI-only history
- major writes should be traceable
- equivalent actions should produce consistent event structures
- audit logging should align with canonical write paths

The database schema should support this cleanly rather than forcing ad hoc logging later.

---

## Idempotency and write-safety rules

Some domains require retry-safe writes.

When a flow can be retried, replayed, webhooked, or double-submitted, the backend design should consider:
- idempotency keys
- unique constraints
- conflict handling
- dedupe helpers
- canonical write ownership

Examples where this often matters:
- payment events
- booking-public submit flows
- invite acceptance
- automation enrollment
- webhook-driven writes
- provider check-in/out or completion events if duplicate triggers are plausible

Do not rely on the UI alone to prevent duplicate writes.

---

## RLS rules

### RLS must match real access patterns
Claude must not describe RLS as “to be added later” for core tenant-owned data.

Before shipping a major domain, Claude must be able to explain:
- who can read it
- who can write it
- how tenant scope is enforced
- whether service-role or backend-only mutations are involved
- how route/query behavior aligns with policy behavior

### No policy fiction
Do not write code that assumes access patterns the policies do not actually allow.

### Membership-aware protection
For protected staff data, business membership should be the real gate where relevant.
Do not weaken access rules just to make a feature appear to work.

---

## Indexing rules

Every major table should have an intentional index strategy.

Required:
- index fields used frequently in lookups, joins, filters, or ordering
- tenant-aware access paths supported
- lifecycle/status filtering supported where common
- uniqueness enforced where business truth requires it

Claude must be able to explain:
- how this table is queried
- which indexes support those queries
- whether the index strategy matches tenant-scoped usage

Avoid:
- adding major tables with no thought to real query patterns
- indexing everything blindly
- ignoring composite indexes where tenant + status + date are the actual access path

---

## Views and reporting models

Use views or reporting tables when they create trusted read models.
Do not create shadow truth.

Allowed:
- analytics/reporting views
- dashboard read models
- denormalized read helpers for performance or clarity

Not allowed:
- writable views treated as separate business owners
- report models that redefine KPI truth differently from the canonical source logic
- page-local SQL/view logic copied across surfaces

---

## Naming and clarity rules

Schema names should make ownership obvious.

Prefer:
- clear domain nouns
- lifecycle names that reflect business meaning
- explicit association names
- consistent timestamp/status naming

Avoid:
- vague tables
- overloaded “misc/settings/data” buckets
- names that hide whether something is a config, event, ledger, or primary entity

A future reader should be able to understand what a table is for without guessing.

---

## Forbidden database patterns

Do not introduce:
- tenant-owned tables without clear tenant ownership
- duplicate tables for similar lifecycle concepts across domains
- vague booleans standing in for complex lifecycle truth
- JSON blobs used to avoid proper modeling
- foreign-key-like columns with no integrity where integrity matters
- page-driven schema additions with no domain owner
- report tables used as shadow write models
- nullable “do everything” tables with mixed responsibilities
- schema shortcuts that make canonical ownership fuzzy

---

## Required questions before adding or changing schema

Claude must answer:

1. what domain owns this?
2. what truth does it represent?
3. what is the canonical write path?
4. who reads it?
5. how is tenant safety enforced?
6. what is the lifecycle model?
7. does it need auditability?
8. does it need idempotency protection?
9. what indexes are required?
10. why is this structure better than the simpler alternatives?

If these answers are weak, the schema change is not ready.

---

## Minimal migration hygiene in this doc

Migration behavior should follow `09-migration-policy.md`, but at minimum:

- all schema changes go through migrations
- keep migrations small and coherent
- avoid mixing unrelated changes in one migration
- make destructive changes intentional and documented
- prefer reversible changes where practical
- keep schema evolution reviewable

---

## Definition of database success

Nadif’s database is successful when:
- ownership is explicit
- tenant safety is built in
- lifecycle truth is clear
- relational structure is trustworthy
- important changes are auditable
- retries do not easily corrupt business truth
- the schema becomes easier to reason about as the product grows