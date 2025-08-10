import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { stripeProducts } from '@/lib/stripe-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Webhook event received:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        // Handle payment succeeded - can be implemented later
        console.log('Payment succeeded:', event.data.object);
        break;
      
      case 'invoice.payment_failed':
        // Handle payment failed - can be implemented later
        console.log('Payment failed:', event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    if (!session.customer_email || !session.metadata?.userId) {
      console.error('Missing customer email or user ID in session');
      return;
    }

    const planId = session.metadata.planId;
    const stripeProduct = stripeProducts.find(p => p.id === planId);
    
    if (!stripeProduct) {
      console.error('Invalid plan ID:', planId);
      return;
    }

    // Update user's subscription status
    const userRef = adminDb.collection('users').doc(session.metadata.userId);
    await userRef.update({
      subscription_status: 'active',
      plan: planId,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      updatedAt: new Date(),
    });

    // Update tenant subscription
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    if (userData?.tenant_id) {
      const tenantRef = adminDb.collection('tenants').doc(userData.tenant_id);
      await tenantRef.update({
        subscription_status: 'active',
        plan: planId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        updatedAt: new Date(),
      });
    }

    console.log(`Subscription activated for user ${session.metadata.userId}, plan: ${planId}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error('No user ID in subscription metadata');
      return;
    }

    const planId = subscription.metadata?.planId;
    const stripeProduct = stripeProducts.find(p => p.id === planId);
    
    if (!stripeProduct) {
      console.error('Invalid plan ID:', planId);
      return;
    }

    const status = subscription.status === 'active' ? 'active' : 'inactive';

    // Update user subscription
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      subscription_status: status,
      plan: planId,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date(),
    });

    // Update tenant subscription
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    if (userData?.tenant_id) {
      const tenantRef = adminDb.collection('tenants').doc(userData.tenant_id);
      await tenantRef.update({
        subscription_status: status,
        plan: planId,
        stripeSubscriptionId: subscription.id,
        updatedAt: new Date(),
      });
    }

    console.log(`Subscription updated for user ${userId}, status: ${status}, plan: ${planId}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error('No user ID in subscription metadata');
      return;
    }

    // Downgrade to free plan
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({
      subscription_status: 'inactive',
      plan: 'free',
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    });

    // Update tenant subscription
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    if (userData?.tenant_id) {
      const tenantRef = adminDb.collection('tenants').doc(userData.tenant_id);
      await tenantRef.update({
        subscription_status: 'inactive',
        plan: 'free',
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      });
    }

    console.log(`Subscription cancelled for user ${userId}, downgraded to free plan`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}


