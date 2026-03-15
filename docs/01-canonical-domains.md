# Canonical Domains

## Purpose of this document

This document defines Nadif’s canonical domain ownership model.

Its job is to prevent:
- duplicate flows
- duplicate business logic
- shadow settings surfaces
- unclear write ownership
- client-side truth replacing backend truth
- the same concept being implemented differently across staff, customer, and provider experiences

Every important concept in Nadif must belong to one primary domain.
Every domain must have one canonical owner.
Every write path must be intentional.

This document is an ownership contract, not just a list.

---

## Core rule

Every feature, page, workflow, RPC, and mutation must have:

- one **primary domain owner**
- one canonical source of truth
- one canonical write path
- clearly defined read consumers
- clearly defined UI owners
- explicitly forbidden duplication

If a change touches multiple domains, Claude must still identify the **primary owner** before coding.

---

## Ownership model

Each domain definition must specify:

- **What it owns**
- **Source of truth**
- **Canonical write path**
- **Canonical read path / consumers**
- **Primary UI owner**
- **Allowed integrations**
- **Forbidden duplication**

### Definitions

#### Source of truth
The canonical backend tables, RPCs, lifecycle model, or system that owns the domain’s truth.

#### Canonical write path
The approved way this domain is changed.
This should usually be one primary command surface plus its backend write layer.

#### Canonical read consumers
The surfaces allowed to read or present this domain’s data.

#### Primary UI owner
The main surface where staff configures or operates that domain.

#### Allowed integrations
Other systems that may interact with the domain without becoming its owner.

#### Forbidden duplication
Logic, settings, workflows, or UI patterns that must not be recreated elsewhere.

---

## Global rules

### 1) One domain, one owner
Every domain must have one clear owner.
No domain may have parallel write ownership across unrelated surfaces.

### 2) Reads do not imply ownership
A page may read a domain without owning it.
Displaying pricing does not make a page the pricing owner.
Displaying payment state does not make a page the payment owner.

### 3) Cross-domain flows still need one primary owner
A booking creation flow touches customers, addresses, services, pricing, scheduling, payments, and providers.
That does not make it a shared-ownership flow.
It is still a **Booking-owned** flow that consumes other domains canonically.

### 4) Backend truth wins
Critical lifecycle, pricing, payment, dispatch, capacity, and automation rules must be owned in canonical backend systems.
Client UI must not become a shadow owner.

### 5) A domain should usually have one canonical staff command surface
If multiple staff surfaces edit the same domain, their relationship must be intentional and documented.
“Convenient duplication” is not allowed.

### 6) No silent domain expansion
If a feature starts owning responsibilities outside its domain, the docs must be updated before implementation proceeds.

---

## Domain registry

## 1) Tenant / Business Context
**Owns**
- business identity
- tenant context resolution
- tenant-scoped app access
- business-level configuration boundaries

**Source of truth**
- business / tenant records
- tenant membership relationships
- tenant-scoped backend context

**Canonical write path**
- tenant onboarding flows
- business settings surfaces
- membership/invite acceptance flows where applicable

**Canonical read consumers**
- all protected staff surfaces
- customer/provider experience resolution where relevant
- analytics, billing, permissions, settings

**Primary UI owner**
- onboarding + business settings

**Allowed integrations**
- auth
- billing
- role access
- analytics segmentation

**Forbidden duplication**
- hardcoded default business context
- route-level tenant guessing
- separate “lightweight tenant model” inside feature domains

---

## 2) Auth
**Owns**
- identity authentication
- session state
- sign-up, sign-in, sign-out
- auth recovery flows
- confirmed access to the product

**Source of truth**
- auth provider + auth session lifecycle

**Canonical write path**
- canonical auth entry flows
- invite-aware auth acceptance when relevant

**Canonical read consumers**
- onboarding
- route protection
- membership resolution
- staff/customer/provider auth gates

**Primary UI owner**
- auth entry surfaces

**Allowed integrations**
- tenant onboarding
- invites
- permissions

**Forbidden duplication**
- fake auth state
- bypass auth patterns
- multiple post-auth decision owners

---

## 3) Customers
**Owns**
- customer identity within a business
- customer profile data
- customer contactability and account-level context
- customer relationship history in Nadif

**Source of truth**
- customer records and linked business ownership

**Canonical write path**
- customers command surface
- booking/quote creation only through approved customer creation or selection flows

**Canonical read consumers**
- bookings
- quotes
- payments
- automations
- reviews
- referrals
- rewards
- analytics

**Primary UI owner**
- customers page / customer detail surfaces

**Allowed integrations**
- booking creation
- quote creation
- campaign/automation targeting
- review and loyalty flows

**Forbidden duplication**
- booking-local fake customer records
- quote-only customer shadow models
- ad hoc customer contact stores inside other features

---

## 4) Addresses / Service Locations
**Owns**
- service addresses
- property/location records
- property metadata used for service delivery
- customer-to-location relationships

**Source of truth**
- address/location records linked to customer and tenant

**Canonical write path**
- customer/location management surfaces
- booking/quote creation through approved location flows

**Canonical read consumers**
- bookings
- quotes
- pricing
- scheduling
- dispatch
- automations
- provider instructions

**Primary UI owner**
- customer property/location management

**Allowed integrations**
- booking wizard
- quote flow
- dispatch prep
- service area validation

**Forbidden duplication**
- storing freeform address truth separately in each booking flow
- quote-only property models
- duplicate property metadata stores

---

## 5) Services
**Owns**
- service catalog
- service definitions
- service-level configuration
- service availability and structure

**Source of truth**
- service definitions and related configuration tables

**Canonical write path**
- services command surface

**Canonical read consumers**
- booking creation
- quotes
- pricing
- automations
- analytics
- customer-facing booking flows

**Primary UI owner**
- services page / service detail setup

**Allowed integrations**
- pricing
- add-ons
- scheduling rules
- provider qualification logic

**Forbidden duplication**
- defining service behavior independently inside booking flows
- quote-specific service catalogs
- dispatch-specific service naming logic

---

## 6) Pricing
**Owns**
- pricing engine
- price modifiers
- fees
- discounts
- surcharges
- pricing policies and calculation rules

**Source of truth**
- canonical pricing engine
- pricing tables
- pricing RPCs / calculation services

**Canonical write path**
- pricing center / pricing rules surfaces

**Canonical read consumers**
- quote generation
- booking creation
- booking modification
- customer checkout
- previews
- staff estimation
- analytics

**Primary UI owner**
- pricing rules / pricing center

**Allowed integrations**
- services
- promotions
- payments
- deep clean rules
- arrival window pricing
- lockout/cancellation policies

**Forbidden duplication**
- ad hoc pricing logic inside components
- hardcoded fee math inside pages
- separate quote pricing engine
- separate booking pricing engine

---

## 7) Booking
**Owns**
- the canonical service order lifecycle
- booking creation and modification
- booking state progression
- booking detail truth
- operational booking record seen by staff, customer, and provider

**Source of truth**
- booking lifecycle model
- booking tables
- booking RPCs / orchestration layer

**Canonical write path**
- booking creation suite
- booking command center
- approved lifecycle actions

**Canonical read consumers**
- calendar
- dispatch
- providers
- payments
- automations
- reviews
- analytics
- customer and provider views

**Primary UI owner**
- bookings page + booking command/detail surfaces

**Allowed integrations**
- quotes
- pricing
- scheduling
- dispatch
- payments
- audit trail

**Forbidden duplication**
- quote systems behaving like shadow bookings
- separate recurring booking ownership outside booking domain
- multiple booking modification systems with different rules

---

## 8) Scheduling Context
**Owns**
- requested date/time intent
- arrival window interpretation
- scheduling-related customer preferences
- normalized scheduling context used by booking and dispatch

**Source of truth**
- scheduling resolver / canonical scheduling fields

**Canonical write path**
- booking/quote scheduling flows through approved resolver logic

**Canonical read consumers**
- booking detail
- capacity
- dispatch
- provider views
- customer booking summaries

**Primary UI owner**
- booking/quote scheduling steps and booking scheduling controls

**Allowed integrations**
- pricing
- capacity
- dispatch
- automations

**Forbidden duplication**
- storing scheduling meaning differently in booking vs dispatch vs provider flows
- client-only interpretation of arrival windows
- parallel “friendly time” models

---

## 9) Capacity
**Owns**
- bookability rules
- scheduling limits
- zone/day/time availability policies
- supply-side constraints used before dispatch

**Source of truth**
- capacity rules
- overrides
- availability models
- capacity resolution logic

**Canonical write path**
- capacity center / scheduling policy surfaces

**Canonical read consumers**
- booking scheduling
- quotes
- dispatch planning
- customer availability selection

**Primary UI owner**
- capacity center

**Allowed integrations**
- scheduling context
- provider availability
- service area logic

**Forbidden duplication**
- isolated client-side caps
- booking-flow-only capacity rules
- provider drawer availability logic that bypasses canonical capacity

---

## 10) Quotes
**Owns**
- pre-booking commercial offers
- quote lifecycle
- draft/quote state
- quote acceptance / conversion path

**Source of truth**
- quote lifecycle model
- quote tables
- quote orchestration layer

**Canonical write path**
- quote creation flow
- quote page / quote command surface

**Canonical read consumers**
- customers
- booking conversion
- payments
- automations
- analytics

**Primary UI owner**
- quotes page / quote detail surfaces

**Allowed integrations**
- pricing
- scheduling
- automations
- campaign center
- customer approval/payment flows

**Forbidden duplication**
- storing quotes as half-bookings without clear lifecycle rules
- nurture logic owned outside canonical quote/campaign systems
- multiple conversion paths with conflicting state models

---

## 11) Payments
**Owns**
- payment state
- payment collection lifecycle
- authorization/capture/refund state
- customer payment obligations
- payment method linkage to bookings/quotes where applicable

**Source of truth**
- payment lifecycle model
- payment records
- payment provider integration state

**Canonical write path**
- payment command surfaces
- approved payment RPCs / backend handlers
- payment provider webhooks

**Canonical read consumers**
- bookings
- quotes
- customers
- analytics
- audit activity

**Primary UI owner**
- payments surfaces + booking/quote payment sections

**Allowed integrations**
- pricing
- refunds
- payout logic
- invoicing if introduced

**Forbidden duplication**
- booking-local payment truth
- hand-maintained “paid/unpaid” UI state
- multiple interpretations of payment status

---

## 12) Providers
**Owns**
- provider records
- provider profile and eligibility
- provider working context
- provider-facing identity inside the business

**Source of truth**
- provider records and related operational metadata

**Canonical write path**
- provider management surfaces

**Canonical read consumers**
- dispatch
- booking assignment
- payout calculations
- provider app/views
- analytics

**Primary UI owner**
- providers page / provider detail surfaces

**Allowed integrations**
- capacity
- dispatch
- rewards
- reviews
- files

**Forbidden duplication**
- booking-local helper records becoming shadow providers
- multiple provider identity systems
- provider availability stored independently across domains without ownership clarity

---

## 13) Dispatch
**Owns**
- assignment operations
- routing of bookings to providers
- dispatch status and assignment decisions
- operational handoff from scheduling to execution

**Source of truth**
- dispatch model
- assignment records
- dispatch RPCs / workflows

**Canonical write path**
- dispatch center
- booking assignment controls when explicitly delegated by dispatch rules

**Canonical read consumers**
- bookings
- providers
- calendars
- analytics
- provider operational surfaces

**Primary UI owner**
- dispatch center / staffing and assignment surfaces

**Allowed integrations**
- capacity
- scheduling context
- provider domain
- audit activity

**Forbidden duplication**
- assignment logic hidden separately in booking detail, calendar, and provider pages
- shadow dispatch systems
- manual assignment state that bypasses canonical dispatch ownership

---

## 14) Automations
**Owns**
- event-driven and scheduled automation logic
- nurture and follow-up triggers
- automation enrollment and stop conditions
- automation execution policies

**Source of truth**
- automation rules
- trigger logic
- queue/execution state
- campaign linkage where relevant

**Canonical write path**
- automations / campaign center surfaces

**Canonical read consumers**
- quotes
- bookings
- customers
- reviews
- referrals
- rewards
- analytics

**Primary UI owner**
- automations center / campaign center

**Allowed integrations**
- messaging
- quotes
- payments
- reviews
- customer lifecycle flows

**Forbidden duplication**
- quote-local nurture engines
- booking-local follow-up schedulers
- hidden cron behavior with no canonical automation ownership

---

## 15) Reviews
**Owns**
- review request lifecycle
- review link delivery state
- review capture support flows
- review-related operational tracking

**Source of truth**
- review request records and review workflow state

**Canonical write path**
- reviews system / review automation flows

**Canonical read consumers**
- customers
- bookings
- providers
- rewards
- analytics

**Primary UI owner**
- reviews / reputation management surfaces

**Allowed integrations**
- automations
- QR flows
- rewards
- referrals

**Forbidden duplication**
- booking-complete-only hardcoded review follow-up logic
- separate review tracking stores in marketing tools

---

## 16) Referrals
**Owns**
- referral codes and attribution
- referral lifecycle
- referral reward eligibility logic
- referral conversion tracking

**Source of truth**
- referral records
- referral attribution model

**Canonical write path**
- referrals system

**Canonical read consumers**
- customers
- rewards
- analytics
- automations

**Primary UI owner**
- referrals surfaces

**Allowed integrations**
- rewards
- reviews
- customer invites
- campaigns

**Forbidden duplication**
- discount-only referral implementations
- separate customer-share links with no canonical attribution owner

---

## 17) Rewards
**Owns**
- points, credits, perks, loyalty/reward state
- reward earning and redemption logic
- reward balances and reward-trigger policies

**Source of truth**
- rewards ledger / reward rules / reward balance models

**Canonical write path**
- rewards engine / rewards management surfaces

**Canonical read consumers**
- customers
- referrals
- reviews
- bookings
- analytics

**Primary UI owner**
- rewards surfaces

**Allowed integrations**
- payments
- referrals
- reviews
- automations

**Forbidden duplication**
- referral-specific reward ledgers
- booking-local loyalty math
- reward balances calculated ad hoc in the UI

---

## 18) Analytics
**Owns**
- reporting definitions
- metrics logic
- cross-domain measurement rules
- trusted derived business reporting

**Source of truth**
- analytics models
- event definitions
- reporting tables/views

**Canonical write path**
- analytics definitions are written by product/backend ownership, not ad hoc dashboard code

**Canonical read consumers**
- dashboards
- staff reporting
- optimization surfaces

**Primary UI owner**
- analytics dashboards and reports

**Allowed integrations**
- all event-producing domains

**Forbidden duplication**
- each page inventing its own metric definitions
- conflicting KPI logic across dashboards
- UI-only calculations presented as trusted business reporting

---

## 19) Files / Attachments
**Owns**
- uploaded files
- attachment metadata
- entity linkage for documents/images/files
- secure access rules for stored assets

**Source of truth**
- storage + attachment metadata records

**Canonical write path**
- approved upload flows tied to owning domain entities

**Canonical read consumers**
- bookings
- providers
- customers
- reviews
- audit flows

**Primary UI owner**
- the owning domain surface plus shared file handling primitives

**Allowed integrations**
- storage
- provider verification
- booking photos
- attachments on operational records

**Forbidden duplication**
- direct file handling with no attachment model
- untracked uploads
- duplicate attachment metadata stores per feature

---

## 20) Audit Activity
**Owns**
- business event history
- operational traceability
- actor/action/change logging
- user-visible activity timelines where relevant

**Source of truth**
- audit/event log model

**Canonical write path**
- shared audit/event helpers invoked by canonical mutations

**Canonical read consumers**
- bookings
- customers
- quotes
- payments
- providers
- analytics

**Primary UI owner**
- activity timelines and audit views within owning domains

**Allowed integrations**
- every important mutation-producing domain

**Forbidden duplication**
- ad hoc page-level history arrays
- partial event logging in only some mutations
- multiple event schemas for equivalent actions

---

## Domain interaction rules

### Primary owner rule
Every feature spec must declare:
- primary domain owner
- touched secondary domains
- why the primary owner is primary

### No borrowed ownership
A feature may consume another domain without taking over its rules.

Examples:
- booking flow may read pricing, but pricing still owns price logic
- dispatch may read provider data, but provider domain still owns provider truth
- quote flow may read scheduling context, but scheduling still owns scheduling normalization

### No duplicate write surfaces without explicit justification
If a second write surface exists, it must be documented as:
- delegated editing
- shortcut editing
- constrained inline editing
- or emergency operational override

Otherwise it should not exist.

### Inline editing rule
Inline edits inside another domain’s UI are allowed only if:
- they call the canonical write path
- they do not create parallel rules
- they are clearly subordinate to the owning domain

---

## Required planning rule before coding

For any non-trivial change, Claude must state:

1. primary domain owner
2. touched secondary domains
3. source of truth being relied on
4. canonical write path being used
5. whether the change introduces or removes any duplicate ownership risk

If that is not clear, coding should not start.

---

## What this document should prevent

This document exists to stop Nadif from becoming:
- a collection of nice-looking but overlapping tools
- a product with multiple booking truths
- a product with pricing logic everywhere
- a product with shadow quote or dispatch systems
- a product with analytics nobody can trust
- a product where pages read like they own domains they actually only consume