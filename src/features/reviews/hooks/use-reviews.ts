'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'
import { useActiveWorkspace } from '@/lib/queries/workspace'

// ============================================================================
// Types
// ============================================================================

export type ReviewRoute = 'internal' | 'google' | 'yelp' | 'facebook' | 'custom'

export type ReviewConfig = {
  id: string
  tenant_id: string
  location_id: string | null
  google_place_id: string | null
  google_review_url: string | null
  yelp_business_id: string | null
  yelp_review_url: string | null
  facebook_page_id: string | null
  facebook_review_url: string | null
  custom_review_url: string | null
  primary_platform: ReviewRoute
  secondary_platform: ReviewRoute | null
  internal_threshold: number
  external_prompt_minimum: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ReviewTokenInfo = {
  token_id: string
  customer_name: string
  service_name: string
  service_date: string
  property_address: string
  internal_threshold: number
  has_google: boolean
  has_yelp: boolean
  has_facebook: boolean
  primary_platform: ReviewRoute
}

export type RatingResult = {
  route: ReviewRoute
  rating: number
  google_url?: string
  yelp_url?: string
  facebook_url?: string
  primary_platform?: ReviewRoute
}

// ============================================================================
// Public Queries (No Auth Required)
// ============================================================================

/**
 * Get review info by token (public)
 */
export function useReviewByToken(token: string | undefined) {
  return useQuery({
    queryKey: token ? queryKeys.reviewToken(token) : ['review-token', 'none'],
    queryFn: async () => {
      if (!token) return null

      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_review_by_token' as never, {
        p_token: token,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as {
        success: boolean
        error?: string
        already_rated?: boolean
      } & Partial<ReviewTokenInfo>

      if (!result.success) {
        if (result.already_rated) {
          return { already_rated: true }
        }
        throw new Error(result.error ?? 'Failed to get review')
      }

      return result as ReviewTokenInfo
    },
    enabled: !!token,
    retry: false,
  })
}

// ============================================================================
// Public Mutations (No Auth Required)
// ============================================================================

/**
 * Submit rating (public)
 */
export function useSubmitRating() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ token, rating }: { token: string; rating: number }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('submit_review_rating' as never, {
        p_token: token,
        p_rating: rating,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; error?: string } & Partial<RatingResult>
      if (!result.success) throw new Error(result.error ?? 'Failed to submit rating')

      return result as RatingResult
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewToken(token) })
    },
  })
}

/**
 * Submit internal feedback (public)
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      token,
      feedbackText,
      feedbackCategory,
      wantsFollowUp,
      preferredContactMethod,
    }: {
      token: string
      feedbackText?: string
      feedbackCategory?: string
      wantsFollowUp?: boolean
      preferredContactMethod?: string
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('submit_internal_feedback' as never, {
        p_token: token,
        p_feedback_text: feedbackText,
        p_feedback_category: feedbackCategory,
        p_wants_follow_up: wantsFollowUp ?? false,
        p_preferred_contact_method: preferredContactMethod,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; feedback_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to submit feedback')

      return result
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewToken(token) })
    },
  })
}

/**
 * Track external review click (public)
 */
export function useTrackExternalClick() {
  return useMutation({
    mutationFn: async ({ token, platform }: { token: string; platform: ReviewRoute }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('track_external_review_click' as never, {
        p_token: token,
        p_platform: platform,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to track click')

      return result
    },
  })
}

// ============================================================================
// Staff Queries (Auth Required)
// ============================================================================

/**
 * Get review config for a location
 */
export function useReviewConfig(locationId?: string) {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? queryKeys.reviewConfig(workspace.tenantId, locationId ?? 'default')
      : ['review-config', 'none'],
    queryFn: async () => {
      if (!workspace) return null

      const supabase = createClient()
      let query = supabase
        .from('review_configs' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)

      if (locationId) {
        query = query.eq('location_id', locationId)
      } else {
        query = query.is('location_id', null)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as ReviewConfig | null
    },
    enabled: !!workspace,
  })
}

/**
 * Get all review configs
 */
export function useReviewConfigs() {
  const { data: workspace } = useActiveWorkspace()

  return useQuery({
    queryKey: workspace
      ? ['review-configs', workspace.tenantId]
      : ['review-configs', 'none'],
    queryFn: async () => {
      if (!workspace) return []

      const supabase = createClient()
      const { data, error } = await supabase
        .from('review_configs' as never)
        .select('*')
        .eq('tenant_id', workspace.tenantId)
        .order('location_id', { ascending: true, nullsFirst: true })

      if (error) throw new Error((error as { message: string }).message)
      return data as unknown as ReviewConfig[]
    },
    enabled: !!workspace,
  })
}

// ============================================================================
// Staff Mutations (Auth Required)
// ============================================================================

/**
 * Create review request for a completed booking
 */
export function useCreateReviewRequest() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('create_review_request' as never, {
        p_booking_id: bookingId,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as {
        success: boolean
        token_id?: string
        token?: string
        expires_at?: string
        error?: string
      }
      if (!result.success) throw new Error(result.error ?? 'Failed to create review request')

      return result
    },
    onSuccess: (_, bookingId) => {
      if (workspace) {
        queryClient.invalidateQueries({ queryKey: queryKeys.booking(workspace.tenantId, bookingId) })
      }
    },
  })
}

/**
 * Upsert review config
 */
export function useUpsertReviewConfig() {
  const queryClient = useQueryClient()
  const { data: workspace } = useActiveWorkspace()

  return useMutation({
    mutationFn: async (input: {
      locationId?: string
      googlePlaceId?: string
      googleReviewUrl?: string
      yelpBusinessId?: string
      yelpReviewUrl?: string
      facebookPageId?: string
      facebookReviewUrl?: string
      customReviewUrl?: string
      primaryPlatform?: ReviewRoute
      secondaryPlatform?: ReviewRoute | null
      internalThreshold?: number
      externalPromptMinimum?: number
      isActive?: boolean
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('upsert_review_config' as never, {
        p_location_id: input.locationId,
        p_google_place_id: input.googlePlaceId,
        p_google_review_url: input.googleReviewUrl,
        p_yelp_business_id: input.yelpBusinessId,
        p_yelp_review_url: input.yelpReviewUrl,
        p_facebook_page_id: input.facebookPageId,
        p_facebook_review_url: input.facebookReviewUrl,
        p_custom_review_url: input.customReviewUrl,
        p_primary_platform: input.primaryPlatform ?? 'google',
        p_secondary_platform: input.secondaryPlatform,
        p_internal_threshold: input.internalThreshold ?? 3,
        p_external_prompt_minimum: input.externalPromptMinimum ?? 4,
        p_is_active: input.isActive ?? true,
      } as never)

      if (error) throw new Error((error as { message: string }).message)
      const result = data as unknown as { success: boolean; config_id?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? 'Failed to save config')

      return result
    },
    onSuccess: (_, { locationId }) => {
      if (workspace) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.reviewConfig(workspace.tenantId, locationId ?? 'default'),
        })
        queryClient.invalidateQueries({
          queryKey: ['review-configs', workspace.tenantId],
        })
      }
    },
  })
}
