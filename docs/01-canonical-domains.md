# Canonical Domains

Every major domain needs one owner and one canonical implementation.

## Core domains
1. Tenant
2. Auth
3. Customers
4. Addresses / service locations
5. Services
6. Pricing
7. Booking
8. Scheduling context
9. Capacity
10. Quotes
11. Payments
12. Providers
13. Dispatch
14. Automations
15. Reviews
16. Referrals
17. Rewards
18. Analytics
19. Files / attachments
20. Audit activity

## Ownership rule
For each domain, define:
- source of truth
- read path
- write path
- UI owners
- allowed integrations

## Example
### Pricing
- source of truth: canonical pricing engine + supporting tables/RPCs
- write path: pricing center / pricing APIs
- read path: quote, booking, checkout, previews
- forbidden: ad hoc pricing logic duplicated inside random components

### Capacity
- source of truth: capacity rules + overrides + scheduling context
- write path: capacity center
- read path: dispatch, booking scheduling, assignment
- forbidden: isolated client-side caps that bypass canonical rules
