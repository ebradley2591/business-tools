'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { CreditCard, Check, AlertTriangle, Users, Database } from 'lucide-react';
import { stripeProducts, StripeProduct } from '@/lib/stripe-config';
import { handleCheckout } from '@/lib/stripe-service';
import ProtectedRoute from '@/components/ProtectedRoute';

// Add free plan to the products array
const allPlans: (StripeProduct | { id: string; name: string; price: number; priceDisplay: string; features: string[]; maxUsers: number; maxCustomers: number; popular?: boolean })[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: 'Free',
    features: [
      'Up to 100 customers',
      'Full-text search (name, phone, address)',
      'Tag filtering system',
      'CSV import functionality',
      'Custom fields support',
      'Ownership history tracking',
      'Mobile responsive design',
      'Multi-tenant security'
    ],
    maxUsers: 5,
    maxCustomers: 100
  },
  ...stripeProducts
];

export default function BillingPage() {
  const { userProfile, getAuthToken } = useAuth();
  const { canAccessBilling } = useUserRole();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<StripeProduct | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCancelMessage, setShowCancelMessage] = useState(false);
  const [usageStats, setUsageStats] = useState({
    activeUsers: 0,
    totalCustomers: 0,
    customFields: 0
  });

  const fetchUsageStats = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/usage-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  useEffect(() => {
    if (userProfile?.plan) {
      const plan = allPlans.find(p => p.id === userProfile.plan);
      setCurrentPlan(plan as StripeProduct || null);
    }
    fetchUsageStats();
  }, [userProfile]);

  // Check for success/cancel URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } else if (urlParams.get('canceled') === 'true') {
      setShowCancelMessage(true);
      setTimeout(() => setShowCancelMessage(false), 5000);
    }
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (!canAccessBilling) {
      alert('Only admins can manage billing');
      return;
    }

    if (planId === 'free') {
      alert('Cannot upgrade to free plan');
      return;
    }

    const stripeProduct = stripeProducts.find(p => p.id === planId);
    if (!stripeProduct) {
      alert('Invalid plan selected');
      return;
    }

    setLoading(planId);
    try {
      await handleCheckout({
        priceId: stripeProduct.stripePriceId,
        planId: planId,
        customerEmail: userProfile?.email,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Error starting checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (!canAccessBilling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access billing settings.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
      {/* Success/Cancel Messages */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-800 font-medium">Payment successful! Your subscription has been activated.</p>
          </div>
        </div>
      )}
      
      {showCancelMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-yellow-800 font-medium">Payment was canceled. You can try again anytime.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and billing information</p>
        </div>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-6 w-6 text-gray-400" />
          <span className="text-sm text-gray-500">Secure billing powered by Stripe</span>
        </div>
      </div>

      {/* Current Plan Status */}
      {currentPlan && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{currentPlan.name}</h3>
              <p className="text-gray-600">
                {userProfile?.isPermanentAccess 
                  ? 'No monthly fee - Activation code used' 
                  : currentPlan.priceDisplay
                }
              </p>
              {userProfile?.activationCodeType && (
                <p className="text-sm text-gray-500 mt-1">
                  Activated with {userProfile.activationCodeType} code
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="space-y-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  userProfile?.subscription_status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {userProfile?.subscription_status === 'active' ? 'Active' : 'Inactive'}
                </span>
                {userProfile?.isPermanentAccess && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    Permanent Access
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Available Plans</h2>
          <p className="text-gray-600 mt-1">Choose the plan that best fits your business needs</p>
          {userProfile?.isPermanentAccess && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Permanent Access:</strong> Your account has permanent access to all features. 
                No monthly payments required.
              </p>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {allPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-lg border-2 p-6 flex flex-col h-full ${
                  plan.popular 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.priceDisplay}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Up to {plan.maxUsers} users
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Database className="h-4 w-4 mr-2" />
                    {plan.maxCustomers === -1 ? 'Unlimited' : `Up to ${plan.maxCustomers}`} customers
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id || plan.id === userProfile?.plan || userProfile?.isPermanentAccess}
                  className={`w-full py-2 px-4 rounded-lg font-medium mt-auto ${
                    plan.id === userProfile?.plan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : userProfile?.isPermanentAccess
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {loading === plan.id ? 'Processing...' : 
                   userProfile?.isPermanentAccess ? 'No Action Needed' :
                   plan.id === userProfile?.plan ? 'Current Plan' : 
                   plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Method</h3>
            <p className="text-gray-600">No payment method on file</p>
            <button className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium">
              Add Payment Method
            </button>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Billing Address</h3>
            <p className="text-gray-600">No billing address on file</p>
            <button className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium">
              Update Billing Address
            </button>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usageStats.activeUsers}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usageStats.totalCustomers}</div>
            <div className="text-sm text-gray-600">Total Customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{usageStats.customFields}</div>
            <div className="text-sm text-gray-600">Custom Fields</div>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
