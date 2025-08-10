# Stripe Integration Guide

This document outlines the Stripe integration for the Smart Customer Directory billing system.

## Overview

The Smart Customer Directory uses Stripe for subscription management with the following features:

- Secure payment processing
- Subscription management
- Webhook handling for real-time updates
- Integration with existing user/tenant system

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Stripe Products and Prices

The system is configured with the following products:

#### Pro Plan

- **Product ID:** `prod_Sp96aDHg04BS21`
- **Price ID:** `price_1RtUoRGPWIddTmC8gyC57QYR`
- **Price:** $29/month
- **Features:** Up to 1,000 customers, enhanced search, unlimited custom fields, priority support

#### Enterprise Plan

- **Product ID:** `prod_Sp97F0QKw1PKHM`
- **Price ID:** `price_1RtUouGPWIddTmC8iznSGAtD`
- **Price:** $99/month
- **Features:** Unlimited customers, advanced user management, dedicated support

## Implementation Details

### Files Structure

```
lib/
├── stripe-config.ts          # Stripe configuration and product definitions
├── stripe-service.ts         # Client-side Stripe service functions
└── firebase-admin.ts         # Server-side Firebase admin (existing)

app/
├── api/stripe/webhook/       # Stripe webhook handler
│   └── route.ts
├── billing/
│   ├── page.tsx             # Billing page with Stripe integration
│   └── success/
│       └── page.tsx         # Success page after payment
```

### Key Components

#### 1. Stripe Configuration (`lib/stripe-config.ts`)

- Defines product configurations
- Contains Stripe publishable key
- Product features and pricing

#### 2. Stripe Service (`lib/stripe-service.ts`)

- Handles checkout session creation
- Manages redirect to Stripe checkout
- Uses existing Cloudflare Worker for session creation

#### 3. Webhook Handler (`app/api/stripe/webhook/route.ts`)

- Processes Stripe webhook events
- Updates user and tenant subscription status
- Handles payment success/failure events

#### 4. Billing Page (`app/billing/page.tsx`)

- Displays available plans
- Integrates with Stripe checkout
- Shows current subscription status

## Webhook Events Handled

The webhook handler processes the following Stripe events:

- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

## Setup Instructions

### 1. Stripe Dashboard Setup

1. **Create Products and Prices**

   - Create Pro plan product with monthly recurring price
   - Create Enterprise plan product with monthly recurring price
   - Note the Product IDs and Price IDs

2. **Configure Webhooks**

   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
   - Copy the webhook secret

3. **Get API Keys**
   - Copy your Stripe Secret Key (starts with `sk_live_`)
   - Copy your Stripe Publishable Key (starts with `pk_live_`)

### 2. Environment Configuration

1. Add Stripe keys to `.env.local`:

   ```bash
   STRIPE_SECRET_KEY=sk_live_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

2. Update `lib/stripe-config.ts` with your publishable key:
   ```typescript
   export const stripePromise = loadStripe("pk_live_your_publishable_key_here");
   ```

### 3. Cloudflare Worker

The system uses an existing Cloudflare Worker for creating checkout sessions:

- **URL:** `https://stripe-checkout-worker.automatehubstudio.workers.dev/create-checkout-session`
- **Purpose:** Creates Stripe checkout sessions with proper metadata

### 4. Testing

1. **Test Mode**: Use Stripe test keys for development
2. **Test Cards**: Use Stripe test card numbers for testing
3. **Webhook Testing**: Use Stripe CLI for local webhook testing

## Security Considerations

- **Webhook Verification**: All webhooks are verified using Stripe signatures
- **Server-side Processing**: Sensitive operations happen server-side
- **Environment Variables**: Keys are stored securely in environment variables
- **HTTPS Required**: Webhooks require HTTPS endpoints

## Error Handling

The system includes comprehensive error handling:

- Network errors during checkout
- Webhook signature verification failures
- Invalid product/price IDs
- Database update failures

## Monitoring

Monitor the following for production:

- Webhook delivery success rates
- Payment success/failure rates
- Subscription status changes
- Error logs in Stripe Dashboard

## Support

For Stripe-related issues:

1. Check Stripe Dashboard for payment status
2. Review webhook delivery logs
3. Check application logs for errors
4. Contact support@automatehubstudio.com

## Dependencies

```json
{
  "@stripe/stripe-js": "^2.0.0",
  "stripe": "^14.0.0"
}
```

## Notes

- The system integrates with existing Firebase user/tenant system
- Subscription status is stored in both user and tenant documents
- Permanent access accounts (activation codes) bypass Stripe billing
- All prices are in USD and billed monthly
