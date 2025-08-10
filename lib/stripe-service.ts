import { stripePromise } from './stripe-config';

export interface CheckoutSessionData {
  priceId: string;
  planId: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export const createCheckoutSession = async (data: CheckoutSessionData) => {
  try {
    // Use the existing stripe-checkout-worker
    const apiUrl = 'https://stripe-checkout-worker.automatehubstudio.workers.dev/create-checkout-session';

    console.log('Creating checkout session with data:', data);
    console.log('Calling API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: data.planId,
        priceId: data.priceId,
        customerEmail: data.customerEmail,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);

      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || 'Failed to create checkout session');
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    }

    const responseText = await response.text();
    console.log('Success response text:', responseText);

    try {
      const { sessionId } = JSON.parse(responseText);
      return sessionId;
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const redirectToCheckout = async (sessionId: string) => {
  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
};

export const handleCheckout = async (data: CheckoutSessionData) => {
  try {
    const sessionId = await createCheckoutSession(data);
    await redirectToCheckout(sessionId);
  } catch (error) {
    console.error('Error handling checkout:', error);
    throw error;
  }
};
