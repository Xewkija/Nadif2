import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Gets the Stripe instance for server-side operations.
 * Uses lazy initialization to avoid issues during build.
 */
export function getStripeServer(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }

    stripeInstance = new Stripe(secretKey, {
      // @ts-expect-error - Using stable Stripe API version
    apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  }

  return stripeInstance
}

/**
 * Creates a Stripe client for a connected account.
 * Uses the Stripe-Account header for direct charges.
 */
export function getStripeForConnectedAccount(connectedAccountId: string): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }

  return new Stripe(secretKey, {
    // @ts-expect-error - Using stable Stripe API version
    apiVersion: '2024-11-20.acacia',
    typescript: true,
    stripeAccount: connectedAccountId,
  })
}

/**
 * Verifies a Stripe webhook signature.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripeServer()
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Platform application fee calculation.
 * Returns the fee in cents based on transaction amount.
 */
export function calculateApplicationFee(amountCents: number): number {
  // 2.5% platform fee, minimum $0.50
  const percentageFee = Math.round(amountCents * 0.025)
  return Math.max(percentageFee, 50)
}
