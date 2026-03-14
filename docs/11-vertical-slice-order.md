# Vertical Slice Order

Build in this order.

## Slice 1
Tenant context + auth shell

## Slice 2
Customers + addresses

## Slice 3
Services + pricing engine foundation

## Slice 4
Booking creation

## Slice 5
Quote lifecycle

## Slice 6
Payment lifecycle

## Slice 7
Provider assignment + availability

## Slice 8
Staff command surfaces

## Slice 9
Automations

## Slice 10
Reviews, referrals, rewards

## Rule
Do not build later slices as fake shells before the earlier slice has canonical backend truth.
