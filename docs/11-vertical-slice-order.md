# Vertical Slice Order

## Purpose of this document

This document defines the required rebuild sequence for Nadif.

Its job is to ensure we rebuild in a way that is:
- canonical
- understandable
- dependency-aware
- safe for multi-tenant product integrity
- resistant to fake progress

This document exists to stop:
- disconnected UI shells
- later domains being built on weak foundations
- duplicate ownership created by out-of-order implementation
- “almost there” slices that do not actually work end-to-end

---

## Core sequencing rule

Build in order.

Do not move meaningfully into later slices until the earlier slice has:
- canonical ownership
- real backend truth
- intended route/surface
- loading/empty/error/success states
- tenant/auth correctness where relevant
- sync/invalidation behavior where relevant
- verification proof

A slice is not considered complete because:
- a page exists
- the UI renders
- a form submits once
- a placeholder backend contract exists
- the happy path works in isolation

A slice is complete only when it is real, canonical, and usable.

---

## Dependency rule

Later slices may consume earlier slices.
They must not redefine them.

Examples:
- booking creation may consume customers, addresses, services, and pricing
- quotes may consume pricing and scheduling truth
- payments may consume booking and quote truth
- provider assignment may consume booking and scheduling truth

But:
- booking creation must not invent a shadow customer model
- quotes must not invent a second pricing engine
- payments must not invent booking-local payment truth
- staff command surfaces must not invent lifecycle rules that belong to earlier domains

---

## Foundation-before-expansion rule

Earlier slices are foundational.
Later slices are expansion and operational leverage.

That means:
- the product should become more correct first
- then more usable
- then more operationally powerful
- then more automated and optimized

Do not reverse that order.

Do not build:
- advanced command centers before lifecycle truth exists
- automations before the triggering domain is canonical
- rewards/referrals on top of weak customer/payment truth
- polished shells for slices whose data model is still unclear

---

## Required completion standard for every slice

Before a slice is considered complete enough to build on, it must have:

1. primary domain owner clearly defined
2. canonical source of truth established
3. canonical write path established
4. intended route/surface exists
5. premium UX direction for the slice is present
6. loading/empty/error/success states exist where relevant
7. tenant/auth/RLS behavior is correct where relevant
8. data freshness/sync works where relevant
9. verification proof exists
10. known gaps are non-core and explicitly listed

If a “completed” slice still lacks core truth or usable surfaces, it is not complete enough to unlock the next slice.

---

## Slice classification

### Foundation slices
These establish the base that later slices depend on.

- Slice 1: Tenant context + auth shell
- Slice 2: Customers + addresses
- Slice 3: Services + pricing engine foundation
- Slice 4: Booking creation
- Slice 5: Quote lifecycle
- Slice 6: Payment lifecycle

### Operations slices
These make the product operationally powerful once the core lifecycle is real.

- Slice 7: Provider assignment + availability
- Slice 8: Staff command surfaces
- Slice 9: Automations

### Growth/retention slices
These expand retention, reputation, and growth loops after the core system is stable.

- Slice 10: Reviews, referrals, rewards

This distinction matters because later slices must stand on stable earlier ones.

---

## Slice order

## Slice 1 — Tenant context + auth shell
This slice establishes:
- auth entry and session handling
- business/tenant resolution
- business membership as the protected access gate
- post-auth decision point
- onboarding shell for users without business context
- route protection foundation

This slice is not done until:
- sign-up/sign-in work
- business context resolves correctly
- protected routes remain protected
- authenticated users are not dead-ended
- no default-tenant shortcuts exist

Later slices may assume:
- auth identity exists
- membership/business context can be resolved canonically

Later slices may not assume:
- fake business context
- route access without real membership truth

---

## Slice 2 — Customers + addresses
This slice establishes:
- customer records
- customer-to-business ownership
- service locations / property records
- customer/location creation and management flows
- canonical read/write ownership for customer and address truth

This slice is not done until:
- customers can be created and managed canonically
- addresses/service locations are attached correctly
- booking/quote flows can consume these entities without shadow models
- empty states explain why this domain matters

Later slices may assume:
- customer truth exists
- location truth exists

Later slices may not assume:
- booking-local fake customer records
- quote-only address truth

---

## Slice 3 — Services + pricing engine foundation
This slice establishes:
- service catalog
- service definitions/configuration
- canonical pricing engine foundation
- pricing rules, modifiers, and calculation ownership
- pricing preview/read surfaces where relevant

This slice is not done until:
- services can be configured canonically
- pricing truth is not page-local
- downstream booking/quote flows can call one real pricing system
- there is no separate quote pricing math and booking pricing math

Later slices may assume:
- services are real
- pricing can be calculated canonically

Later slices may not assume:
- ad hoc pricing logic in UI components
- temporary local math that becomes permanent

---

## Slice 4 — Booking creation
This slice establishes:
- canonical booking creation flow
- booking record creation
- booking read/write lifecycle foundation
- consumption of customer, address, service, pricing, and scheduling truth
- usable creation UX for staff and/or customer flows in scope

This slice is not done until:
- booking creation uses canonical prior-domain truth
- the booking record is real and operationally usable
- success/failure states are clear
- bookings show up correctly in their intended surfaces
- no shadow booking pathways exist

Later slices may assume:
- booking is the canonical service-order domain

Later slices may not assume:
- quote-as-booking shortcuts
- duplicate booking creation suites without justification

---

## Slice 5 — Quote lifecycle
This slice establishes:
- canonical quote/draft model
- quote creation and management
- conversion path from quote to booking where applicable
- quote lifecycle state model
- quote-related customer/staff surfaces

This slice is not done until:
- quote truth is distinct and canonical
- quote conversion is intentional
- pricing reads from the canonical pricing owner
- nurture ownership is not scattered
- quote state does not drift into booking state confusion

Later slices may assume:
- quotes exist as a real pre-booking commercial object

Later slices may not assume:
- half-bookings pretending to be quotes
- multiple quote conversion paths with conflicting truth

---

## Slice 6 — Payment lifecycle
This slice establishes:
- payment state ownership
- payment collection lifecycle
- quote/booking payment linkage where applicable
- payment commands and webhook-driven truth
- visible payment status in downstream surfaces

This slice is not done until:
- payment state is canonical
- statuses are not hand-maintained in the UI
- related booking/quote surfaces read trusted payment truth
- retry/webhook behavior does not easily corrupt state

Later slices may assume:
- payment status is trustworthy
- payment-linked flows can consume canonical payment truth

Later slices may not assume:
- local paid/unpaid flags
- UI-managed payment truth

---

## Slice 7 — Provider assignment + availability
This slice establishes:
- provider records used operationally
- availability context if in scope
- assignment/dispatch foundation
- operational matching between bookings and providers

This slice is not done until:
- providers are real operational entities
- assignment reads booking/scheduling truth canonically
- availability/assignment logic does not bypass capacity or scheduling ownership
- the system does not invent provider shadow models

Later slices may assume:
- provider operations are real and traceable

Later slices may not assume:
- assignment logic hidden in random pages
- duplicate dispatch behavior outside the provider/dispatch model

---

## Slice 8 — Staff command surfaces
This slice establishes:
- premium operational staff experiences
- command-center style views
- editing, oversight, and recovery surfaces
- rich operational UI on top of already-canonical domain truth

This slice is not done until:
- command surfaces are powered by real domain truth
- surfaces feel premium, guided, and operationally strong
- they do not become shadow owners of earlier lifecycle rules
- UX is meaningfully better than generic admin software

Important:
This slice enhances usability.
It does not replace domain ownership already established in earlier slices.

---

## Slice 9 — Automations
This slice establishes:
- automation rules/triggers
- campaign/nurture ownership
- event-driven and scheduled follow-up logic
- enrollment/stop behavior tied to real domain events

This slice is not done until:
- triggering domains are already canonical
- automation ownership is clear
- quote/booking/review follow-up logic is not fragmented
- automation execution is traceable and understandable

Automations must sit on top of real lifecycle truth, not compensate for weak earlier slices.

---

## Slice 10 — Reviews, referrals, rewards
This slice establishes:
- reputation loops
- referral attribution
- reward/loyalty state
- growth and retention layers powered by the core system

This slice is not done until:
- core customer, booking, and payment truth are stable enough to support it
- attribution/reward logic is canonical
- the features do not introduce shadow ledgers or ad hoc growth hacks
- the UX feels integrated with the rest of the product

These are growth multipliers, not foundation substitutes.

---

## Anti-fake-progress rule

Do not mark a slice as completed when it is only:
- a route shell
- a pretty empty page
- a form with no canonical backend truth
- a local-only implementation
- a mock-backed surface
- a loosely wired prototype
- a feature with only a happy-path demo

That is not slice completion.
That is scaffolding.

Scaffolding is allowed.
But scaffolding must not be mistaken for completion.

---

## Partial completion rule

If a slice is partially complete, it must be described honestly.

Allowed examples:
- backend truth complete, premium UI still pending
- canonical write path complete, staff editing surface still pending
- route and core states complete, advanced command modules deferred

Not allowed:
- saying the slice is “done” when the remaining work is actually core to the slice

---

## Re-sequencing rule

The default order above should be followed unless a written plan explicitly justifies a deviation.

A valid re-sequencing explanation must state:
- why the dependency order still holds
- what foundational truth already exists
- why the out-of-order work does not create duplication risk
- why this is not fake progress

Without that proof, stay in order.

---

## Required planning output before starting a slice

Before starting any slice, Claude must state:

1. slice name
2. why it is unlocked now
3. primary domain owner(s)
4. dependency slices it consumes
5. canonical write path(s)
6. intended surfaces in scope
7. what counts as complete for this slice
8. what is explicitly out of scope

---

## Required completion summary for a slice

Before calling a slice complete enough to build on, Claude must state:

1. what truth now exists canonically
2. which surfaces are real and usable
3. what verification was performed
4. what later slices can now safely consume
5. what gaps remain, if any
6. why those remaining gaps do not block the next slice

---

## Definition of sequencing success

Nadif’s slice order is successful when:
- foundational truth is built before operational polish
- later slices consume earlier ones instead of redefining them
- progress is real rather than cosmetic
- each completed slice makes the next slice easier and safer
- the rebuild becomes more canonical as it advances