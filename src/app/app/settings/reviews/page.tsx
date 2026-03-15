'use client'

import { useState, useEffect } from 'react'
import {
  Star,
  ExternalLink,
  Save,
  Loader2,
  Info,
} from 'lucide-react'
import {
  useReviewConfig,
  useUpsertReviewConfig,
  type ReviewRoute,
} from '@/features/reviews/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

type FormData = {
  googlePlaceId: string
  googleReviewUrl: string
  yelpBusinessId: string
  yelpReviewUrl: string
  facebookPageId: string
  facebookReviewUrl: string
  customReviewUrl: string
  primaryPlatform: ReviewRoute
  secondaryPlatform: string
  internalThreshold: string
}

const INITIAL_FORM: FormData = {
  googlePlaceId: '',
  googleReviewUrl: '',
  yelpBusinessId: '',
  yelpReviewUrl: '',
  facebookPageId: '',
  facebookReviewUrl: '',
  customReviewUrl: '',
  primaryPlatform: 'google',
  secondaryPlatform: '',
  internalThreshold: '3',
}

export default function ReviewSettingsPage() {
  const { data: config, isLoading } = useReviewConfig()
  const upsertMutation = useUpsertReviewConfig()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const [hasChanges, setHasChanges] = useState(false)

  // Load config into form
  useEffect(() => {
    if (config) {
      setFormData({
        googlePlaceId: config.google_place_id ?? '',
        googleReviewUrl: config.google_review_url ?? '',
        yelpBusinessId: config.yelp_business_id ?? '',
        yelpReviewUrl: config.yelp_review_url ?? '',
        facebookPageId: config.facebook_page_id ?? '',
        facebookReviewUrl: config.facebook_review_url ?? '',
        customReviewUrl: config.custom_review_url ?? '',
        primaryPlatform: config.primary_platform,
        secondaryPlatform: config.secondary_platform ?? '',
        internalThreshold: config.internal_threshold.toString(),
      })
      setHasChanges(false)
    }
  }, [config])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      googlePlaceId: formData.googlePlaceId || undefined,
      googleReviewUrl: formData.googleReviewUrl || undefined,
      yelpBusinessId: formData.yelpBusinessId || undefined,
      yelpReviewUrl: formData.yelpReviewUrl || undefined,
      facebookPageId: formData.facebookPageId || undefined,
      facebookReviewUrl: formData.facebookReviewUrl || undefined,
      customReviewUrl: formData.customReviewUrl || undefined,
      primaryPlatform: formData.primaryPlatform,
      secondaryPlatform: formData.secondaryPlatform as ReviewRoute | undefined || undefined,
      internalThreshold: parseInt(formData.internalThreshold) || 3,
    })
    setHasChanges(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Review Settings"
        description="Configure how customers leave reviews after service"
        actions={
          <Button
            onClick={handleSave}
            disabled={!hasChanges || upsertMutation.isPending}
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        }
      />

      <div className="space-y-6">
        {/* How it works */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            After a booking is completed, customers receive a review request. Based on their rating:
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>1-3 stars:</strong> Directs to internal feedback form (you can follow up)</li>
              <li><strong>4-5 stars:</strong> Prompts to leave a public review on Google, Yelp, etc.</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Rating Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Rating Threshold
            </CardTitle>
            <CardDescription>
              Set the rating threshold for internal vs external reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Internal feedback threshold</Label>
                <Select
                  value={formData.internalThreshold}
                  onValueChange={(value) => handleChange('internalThreshold', value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 star only</SelectItem>
                    <SelectItem value="2">1-2 stars</SelectItem>
                    <SelectItem value="3">1-3 stars (Recommended)</SelectItem>
                    <SelectItem value="4">1-4 stars</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Customers who rate {formData.internalThreshold} stars or below will be asked for private feedback instead of a public review.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Platforms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Review Platforms
            </CardTitle>
            <CardDescription>
              Configure links to your review profiles. Customers with high ratings will be prompted to leave a review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border">
                  <span className="text-lg font-bold text-blue-500">G</span>
                </div>
                <h4 className="font-medium">Google Business</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pl-11">
                <div className="space-y-2">
                  <Label htmlFor="googlePlaceId">Place ID (optional)</Label>
                  <Input
                    id="googlePlaceId"
                    placeholder="ChIJ..."
                    value={formData.googlePlaceId}
                    onChange={(e) => handleChange('googlePlaceId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleReviewUrl">Review URL</Label>
                  <Input
                    id="googleReviewUrl"
                    placeholder="https://g.page/r/..."
                    value={formData.googleReviewUrl}
                    onChange={(e) => handleChange('googleReviewUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Yelp */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-white">Y</span>
                </div>
                <h4 className="font-medium">Yelp</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pl-11">
                <div className="space-y-2">
                  <Label htmlFor="yelpBusinessId">Business ID (optional)</Label>
                  <Input
                    id="yelpBusinessId"
                    placeholder="your-business-name"
                    value={formData.yelpBusinessId}
                    onChange={(e) => handleChange('yelpBusinessId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yelpReviewUrl">Review URL</Label>
                  <Input
                    id="yelpReviewUrl"
                    placeholder="https://www.yelp.com/writeareview/biz/..."
                    value={formData.yelpReviewUrl}
                    onChange={(e) => handleChange('yelpReviewUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Facebook */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-white">f</span>
                </div>
                <h4 className="font-medium">Facebook</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pl-11">
                <div className="space-y-2">
                  <Label htmlFor="facebookPageId">Page ID (optional)</Label>
                  <Input
                    id="facebookPageId"
                    placeholder="your-page-id"
                    value={formData.facebookPageId}
                    onChange={(e) => handleChange('facebookPageId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebookReviewUrl">Review URL</Label>
                  <Input
                    id="facebookReviewUrl"
                    placeholder="https://www.facebook.com/your-page/reviews"
                    value={formData.facebookReviewUrl}
                    onChange={(e) => handleChange('facebookReviewUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Custom */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-gray-600" />
                </div>
                <h4 className="font-medium">Custom Review Page</h4>
              </div>
              <div className="pl-11">
                <div className="space-y-2">
                  <Label htmlFor="customReviewUrl">Custom URL (optional)</Label>
                  <Input
                    id="customReviewUrl"
                    placeholder="https://your-website.com/reviews"
                    value={formData.customReviewUrl}
                    onChange={(e) => handleChange('customReviewUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Platform */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Platform</CardTitle>
            <CardDescription>
              Which platform should be shown first when prompting for reviews?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary</Label>
                <Select
                  value={formData.primaryPlatform}
                  onValueChange={(value) => handleChange('primaryPlatform', value as ReviewRoute)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google (Recommended)</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary (optional)</Label>
                <Select
                  value={formData.secondaryPlatform}
                  onValueChange={(value) => handleChange('secondaryPlatform', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
