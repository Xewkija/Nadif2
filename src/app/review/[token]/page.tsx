'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  Star,
  MapPin,
  Calendar,
  Sparkles,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
} from 'lucide-react'
import {
  useReviewByToken,
  useSubmitRating,
  useSubmitFeedback,
  useTrackExternalClick,
  type ReviewRoute,
  type RatingResult,
  type ReviewTokenInfo,
} from '@/features/reviews/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const feedbackCategories = [
  { value: 'quality', label: 'Cleaning Quality' },
  { value: 'timing', label: 'Timing / Punctuality' },
  { value: 'communication', label: 'Communication' },
  { value: 'staff', label: 'Staff Behavior' },
  { value: 'damage', label: 'Damage or Breakage' },
  { value: 'other', label: 'Other' },
]

const platformLabels: Record<ReviewRoute, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
  custom: 'Our Website',
  internal: 'Internal',
}

export default function ReviewPage() {
  const params = useParams()
  const token = params.token as string

  const { data: reviewInfo, isLoading, error } = useReviewByToken(token)
  const submitRatingMutation = useSubmitRating()
  const submitFeedbackMutation = useSubmitFeedback()
  const trackClickMutation = useTrackExternalClick()

  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [ratingResult, setRatingResult] = useState<RatingResult | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState<string>('')
  const [wantsFollowUp, setWantsFollowUp] = useState(false)
  const [contactMethod, setContactMethod] = useState<string>('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const handleRatingSubmit = async () => {
    if (!selectedRating) return

    try {
      const result = await submitRatingMutation.mutateAsync({
        token,
        rating: selectedRating,
      })
      setRatingResult(result)
    } catch (err) {
      console.error('Failed to submit rating:', err)
    }
  }

  const handleFeedbackSubmit = async () => {
    try {
      await submitFeedbackMutation.mutateAsync({
        token,
        feedbackText: feedbackText || undefined,
        feedbackCategory: feedbackCategory || undefined,
        wantsFollowUp,
        preferredContactMethod: wantsFollowUp ? contactMethod : undefined,
      })
      setFeedbackSubmitted(true)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  const handleExternalClick = async (platform: ReviewRoute, url: string) => {
    try {
      await trackClickMutation.mutateAsync({ token, platform })
      window.open(url, '_blank')
    } catch (err) {
      // Still open the link even if tracking fails
      window.open(url, '_blank')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !reviewInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Review</h2>
            <p className="text-muted-foreground">
              {error?.message || 'This review link may be invalid or expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already rated state
  if ('already_rated' in reviewInfo && reviewInfo.already_rated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Review Already Submitted</h2>
            <p className="text-muted-foreground">
              Thank you! You've already submitted your review for this service.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Feedback submitted state
  if (feedbackSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              We appreciate your feedback and will use it to improve our service.
              {wantsFollowUp && ' A team member will be in touch soon.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // External review prompt (4-5 stars)
  if (ratingResult && ratingResult.route !== 'internal') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-8 w-8',
                      star <= ratingResult.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
              <CardTitle>Thank you for the great rating!</CardTitle>
              <CardDescription>
                Would you mind sharing your experience on one of these platforms?
                It helps us reach more customers like you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ratingResult.google_url && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-14"
                  onClick={() => handleExternalClick('google', ratingResult.google_url!)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border">
                      <span className="text-lg font-bold text-blue-500">G</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Leave a Google Review</p>
                      <p className="text-xs text-muted-foreground">Most helpful for new customers</p>
                    </div>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              )}

              {ratingResult.yelp_url && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-14"
                  onClick={() => handleExternalClick('yelp', ratingResult.yelp_url!)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-white">Y</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Leave a Yelp Review</p>
                      <p className="text-xs text-muted-foreground">Great for local visibility</p>
                    </div>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              )}

              {ratingResult.facebook_url && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-14"
                  onClick={() => handleExternalClick('facebook', ratingResult.facebook_url!)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-white">f</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Leave a Facebook Review</p>
                      <p className="text-xs text-muted-foreground">Share with your network</p>
                    </div>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              )}

              <p className="text-center text-sm text-muted-foreground pt-4">
                Thank you for your support!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Internal feedback form (1-3 stars)
  if (ratingResult && ratingResult.route === 'internal') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-6 w-6',
                      star <= ratingResult.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
              <CardTitle className="text-center">We're Sorry to Hear That</CardTitle>
              <CardDescription className="text-center">
                We take your feedback seriously. Please tell us more so we can make things right.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>What was the main issue?</Label>
                <RadioGroup value={feedbackCategory} onValueChange={setFeedbackCategory}>
                  <div className="grid grid-cols-2 gap-2">
                    {feedbackCategories.map((cat) => (
                      <div key={cat.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={cat.value} id={cat.value} />
                        <Label htmlFor={cat.value} className="text-sm cursor-pointer">
                          {cat.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Additional details (optional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Please share any specific details about your experience..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="followUp"
                    checked={wantsFollowUp}
                    onCheckedChange={(checked) => setWantsFollowUp(checked === true)}
                  />
                  <div>
                    <Label htmlFor="followUp" className="cursor-pointer">
                      I'd like someone to contact me
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      A team member will reach out to address your concerns
                    </p>
                  </div>
                </div>

                {wantsFollowUp && (
                  <RadioGroup value={contactMethod} onValueChange={setContactMethod}>
                    <div className="flex gap-4 pl-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="phone" id="phone" />
                        <Label htmlFor="phone" className="flex items-center gap-1 cursor-pointer">
                          <Phone className="h-4 w-4" /> Phone
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="email" id="email" />
                        <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                          <Mail className="h-4 w-4" /> Email
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleFeedbackSubmit}
                disabled={submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Type guard for full review info
  const fullReviewInfo = reviewInfo as ReviewTokenInfo

  // Initial rating selection
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Hi {fullReviewInfo.customer_name}!
            </CardTitle>
            <CardDescription className="text-base">
              How was your recent cleaning service?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">{fullReviewInfo.service_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(fullReviewInfo.service_date), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{fullReviewInfo.property_address}</span>
              </div>
            </div>

            {/* Star Rating */}
            <div className="text-center">
              <p className="text-sm font-medium mb-4">Tap to rate your experience</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelectedRating(rating)}
                    className={cn(
                      'p-2 rounded-full transition-all',
                      selectedRating !== null && rating <= selectedRating
                        ? 'scale-110'
                        : 'hover:scale-105'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-10 w-10 transition-colors',
                        selectedRating !== null && rating <= selectedRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              {selectedRating && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedRating <= 2 && "We're sorry to hear that"}
                  {selectedRating === 3 && "Thanks for your feedback"}
                  {selectedRating === 4 && "Great!"}
                  {selectedRating === 5 && "Wonderful!"}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedRating || submitRatingMutation.isPending}
              onClick={handleRatingSubmit}
            >
              {submitRatingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Continue
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your feedback helps us improve our service
        </p>
      </div>
    </div>
  )
}
