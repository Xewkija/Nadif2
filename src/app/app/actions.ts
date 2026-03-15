'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { CreateTenantResult } from '@/types/database'

export type CreateBusinessState = {
  success?: boolean
  error?: string
  fieldErrors?: { name?: string; slug?: string }
}

export async function createBusiness(
  _prevState: CreateBusinessState,
  formData: FormData
): Promise<CreateBusinessState> {
  const name = (formData.get('name') as string)?.trim() ?? ''
  const slug = (formData.get('slug') as string)?.toLowerCase().trim() ?? ''

  // Server-side validation
  const fieldErrors: CreateBusinessState['fieldErrors'] = {}

  if (name.length < 2) {
    fieldErrors.name = 'Business name must be at least 2 characters'
  }

  if (slug.length < 3) {
    fieldErrors.slug = 'URL slug must be at least 3 characters'
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    fieldErrors.slug = 'Only lowercase letters, numbers, and hyphens allowed'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors }
  }

  // Call RPC
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_tenant_with_owner', {
    p_name: name,
    p_slug: slug,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data as CreateTenantResult

  if (!result.success) {
    // Map RPC errors to field errors
    if (result.error === 'slug_taken' || result.error === 'invalid_slug' || result.error === 'invalid_slug_format') {
      return { success: false, fieldErrors: { slug: result.message } }
    }
    if (result.error === 'invalid_name') {
      return { success: false, fieldErrors: { name: result.message } }
    }
    return { success: false, error: result.message }
  }

  // Revalidate and redirect for clean tenant context reload
  revalidatePath('/app')
  redirect('/app')
}
