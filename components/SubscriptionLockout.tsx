'use client';

import { useAuth } from '@/components/AuthProvider';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SubscriptionLockout() {
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {userProfile.subscription_status === 'active' ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {userProfile.subscription_status === 'active' 
            ? 'Subscription Active' 
            : 'Subscription Inactive'
          }
        </h1>

        <p className="text-gray-600 mb-6">
          {userProfile.subscription_status === 'active' 
            ? 'Your subscription is active and you have full access to all features.'
            : 'Your subscription has expired. Please update your billing information to continue using the service.'
          }
        </p>

        {userProfile.subscription_status !== 'active' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                Access Restricted
              </h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Customer search and viewing disabled</li>
                <li>• Import functionality unavailable</li>
                <li>• Settings access restricted</li>
                <li>• Data export disabled</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.href = '/billing'}
              className="btn-primary w-full flex items-center justify-center"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Billing Information
            </button>

            <p className="text-xs text-gray-500">
              Need help? Contact support at support@automatehubstudio.com
            </p>
          </div>
        )}

        {userProfile.subscription_status === 'active' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              Current Plan: {userProfile.plan?.toUpperCase() || 'FREE'}
            </h3>
            <p className="text-sm text-green-700">
              You have access to all features included in your current plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
