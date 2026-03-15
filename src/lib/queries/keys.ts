/**
 * Query Key Factory
 * Centralized query keys for TanStack Query
 * All keys used in invalidation must be defined here.
 */

export const queryKeys = {
  // === CORE ENTITY KEYS ===

  // Services
  services: (tenantId: string) => ['services', tenantId] as const,
  service: (tenantId: string, id: string) => ['services', tenantId, id] as const,

  // Service Categories
  serviceCategories: (tenantId: string) => ['service-categories', tenantId] as const,

  // Add-ons
  addOns: (tenantId: string) => ['add-ons', tenantId] as const,
  addOn: (tenantId: string, id: string) => ['add-ons', tenantId, id] as const,

  // Customers
  customers: (tenantId: string) => ['customers', tenantId] as const,
  customer: (tenantId: string, id: string) => ['customers', tenantId, id] as const,

  // Properties
  properties: (tenantId: string, customerId: string) =>
    ['properties', tenantId, customerId] as const,
  property: (tenantId: string, id: string) => ['properties', tenantId, 'detail', id] as const,

  // Bookings
  bookings: (tenantId: string, filters?: object) => ['bookings', tenantId, filters] as const,
  booking: (tenantId: string, id: string) => ['bookings', tenantId, id] as const,

  // Recurring Series
  recurringSeries: (tenantId: string) => ['recurring-series', tenantId] as const,
  series: (tenantId: string, id: string) => ['recurring-series', tenantId, id] as const,
  seriesOccurrences: (tenantId: string, seriesId: string) =>
    ['series-occurrences', tenantId, seriesId] as const,

  // Pricing
  pricingRules: (tenantId: string) => ['pricing-rules', tenantId] as const,
  pricePreview: (tenantId: string, params: object) =>
    ['price-preview', tenantId, params] as const,

  // Policies
  policies: (tenantId: string, type: string) => ['policies', tenantId, type] as const,

  // Tenant Settings
  tenantSettings: (tenantId: string) => ['tenant-settings', tenantId] as const,

  // === DERIVED / AGGREGATE KEYS ===

  // Dashboard counters
  dashboardCounters: (tenantId: string) => ['dashboard-counters', tenantId] as const,

  // Calendar views
  calendarBookings: (tenantId: string, startDate: string, endDate: string) =>
    ['calendar-bookings', tenantId, startDate, endDate] as const,

  // Provider schedule
  providerSchedule: (tenantId: string, providerId: string, date: string) =>
    ['provider-schedule', tenantId, providerId, date] as const,

  // Today's schedule
  todaySchedule: (tenantId: string) => ['today-schedule', tenantId] as const,

  // === PAYMENT KEYS ===

  // Customer payment methods
  customerPaymentMethods: (tenantId: string, customerId: string) =>
    ['payment-methods', tenantId, customerId] as const,

  // Payment gate evaluation
  paymentGate: (tenantId: string, bookingId?: string, customerId?: string) =>
    ['payment-gate', tenantId, bookingId, customerId] as const,

  // Payment policies
  paymentPolicies: (tenantId: string) => ['payment-policies', tenantId] as const,

  // Payment transactions
  paymentTransactions: (tenantId: string, bookingId: string) =>
    ['payment-transactions', tenantId, bookingId] as const,

  // === LOCATION KEYS ===

  // Tenant locations
  locations: (tenantId: string) => ['locations', tenantId] as const,
  location: (tenantId: string, id: string) => ['locations', tenantId, id] as const,

  // Service areas
  serviceAreas: (tenantId: string, locationId?: string) =>
    ['service-areas', tenantId, locationId ?? 'all'] as const,

  // === REVIEW KEYS ===

  // Review token (public, no tenantId)
  reviewToken: (token: string) => ['review-token', token] as const,

  // Review config (per location)
  reviewConfig: (tenantId: string, locationId: string) =>
    ['review-config', tenantId, locationId] as const,

  // === WORKSPACE KEYS ===

  // User memberships (per user, not tenant)
  userMemberships: () => ['user-memberships'] as const,

  // Active workspace
  activeWorkspace: () => ['active-workspace'] as const,
}

export type QueryKeys = typeof queryKeys
