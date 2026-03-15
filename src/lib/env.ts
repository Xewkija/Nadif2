/**
 * Environment variable access with validation.
 * Fail fast if required variables are missing.
 */

function getEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getPublicEnvVar(key: string): string {
  // For client-side, check both window and process.env
  const value = typeof window !== 'undefined'
    ? (process.env[key] ?? '')
    : process.env[key]

  if (!value) {
    throw new Error(`Missing required public environment variable: ${key}`)
  }
  return value
}

function getOptionalPublicEnvVar(key: string): string | undefined {
  const value = typeof window !== 'undefined'
    ? (process.env[key] ?? undefined)
    : process.env[key]
  return value || undefined
}

export const env = {
  supabase: {
    url: () => getPublicEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: () => getPublicEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
  stripe: {
    publishableKey: () => getOptionalPublicEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  },
} as const
