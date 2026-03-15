'use client'

import { useActionState, useEffect, useState } from 'react'
import { createBusiness, type CreateBusinessState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CreateBusinessForm() {
  const [state, formAction, isPending] = useActionState<CreateBusinessState, FormData>(
    createBusiness,
    {}
  )
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(generateSlug(name))
    }
  }, [name, slugManuallyEdited])

  return (
    <Card className="w-full border-border/50 shadow-sm">
      <CardHeader className="space-y-4 p-8 pb-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Account setup
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Create your business
          </h2>
          <p className="text-muted-foreground">
            Name your business to start managing operations.
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-6">
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Business Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Sparkle Cleaning Co."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              aria-describedby={state.fieldErrors?.name ? 'name-error' : undefined}
              className={cn(
                'h-11',
                state.fieldErrors?.name && 'border-destructive'
              )}
            />
            {state.fieldErrors?.name && (
              <p id="name-error" className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-medium">
              URL Slug
            </Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              placeholder="sparkle-cleaning"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase())
                setSlugManuallyEdited(true)
              }}
              disabled={isPending}
              aria-describedby="slug-help"
              className={cn(
                'h-11',
                state.fieldErrors?.slug && 'border-destructive'
              )}
            />
            <p id="slug-help" className="text-sm text-muted-foreground">
              nadif.app/<span className="text-foreground">{slug || 'your-slug'}</span>
            </p>
            {state.fieldErrors?.slug && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.slug}
              </p>
            )}
          </div>

          {state.error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 text-sm font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your business...
              </>
            ) : (
              'Create Business'
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Have an invite?{' '}
            <span className="text-foreground">
              Check your email for the invite link.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
