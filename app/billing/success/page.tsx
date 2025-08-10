'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const { refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // Refresh user profile to get updated subscription status
      refreshUserProfile().finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [searchParams, refreshUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">
            Your subscription has been activated successfully. You now have access to all the features of your new plan.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">What&apos;s Next?</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Your subscription is now active</li>
              <li>• You can access all plan features immediately</li>
              <li>• You&apos;ll receive a confirmation email shortly</li>
              <li>• Manage your subscription in the billing section</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Link
              href="/dashboard"
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
            
            <Link
              href="/billing"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              View Billing Details
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@automatehubstudio.com" className="text-primary-600 hover:underline">
              support@automatehubstudio.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
