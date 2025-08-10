import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key (use test key for development)
export const stripePromise = loadStripe('pk_live_51RmdAgGPWIddTmC8tx7qpumZGPxIe4bdGd5OzOUZYhKnE9Dnyp8kLp8sHPG5vZKLlxCw2Ffijgml4ZMHeCHnZWGk006OIPmU3r');

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  priceDisplay: string;
  stripePriceId: string;
  features: string[];
  maxUsers: number;
  maxCustomers: number;
  popular?: boolean;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for growing businesses',
    price: 29,
    priceDisplay: '$29/month',
    stripePriceId: 'price_1RtUoRGPWIddTmC8gyC57QYR',
    features: [
      'Up to 1,000 customers',
      'Enhanced search capabilities',
      'Advanced tag management',
      'Unlimited custom fields',
      'Priority support',
      'Role-based access control',
      'Table column customization',
      'Secondary contact information'
    ],
    maxUsers: 10,
    maxCustomers: 1000,
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'All features, premium support, and unlimited scalability',
    price: 99,
    priceDisplay: '$99/month',
    stripePriceId: 'price_1RtUouGPWIddTmC8iznSGAtD',
    features: [
      'Unlimited customers',
      'Advanced user management',
      'Dedicated support',
      'Enhanced security features',
      'Custom field types (text, number, date, select, textarea, boolean)',
      'Comprehensive audit trail',
      'Multi-user collaboration',
      'Professional customer management'
    ],
    maxUsers: 50,
    maxCustomers: -1 // Unlimited
  }
];

export const getStripeProductById = (id: string) => {
  return stripeProducts.find(product => product.id === id);
};
