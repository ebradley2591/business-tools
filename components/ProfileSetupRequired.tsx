'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AlertTriangle, RefreshCw, Building } from 'lucide-react';

export default function ProfileSetupRequired() {
  const { user, refreshUserProfile, getAuthToken } = useAuth();
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRetrySetup = async () => {
    try {
      await refreshUserProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) {
      setError('Business name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/auth/complete-setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantName: tenantName.trim() }),
      });

      if (response.ok) {
        setSuccess(true);
        // Refresh the user profile to get the new tenant information
        setTimeout(() => {
          refreshUserProfile();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to complete setup');
      }
    } catch (error) {
      console.error('Error completing setup:', error);
      setError('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Profile Setup Required
        </h1>

        <p className="text-gray-600 mb-6">
          Your account exists but your business profile needs to be set up. This usually happens when the initial setup process was interrupted.
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Setup Completed Successfully!
              </h3>
              <p className="text-sm text-green-700">
                Your business profile has been created. You'll be redirected to the dashboard shortly.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                What happened?
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Your account was created successfully</li>
                <li>• Business profile setup was incomplete</li>
                <li>• You need to complete the tenant setup</li>
              </ul>
            </div>

            <form onSubmit={handleCompleteSetup} className="space-y-4">
              <div>
                <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  id="tenantName"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Enter your business name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Building className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Setting up...' : 'Complete Business Setup'}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={handleRetrySetup}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Try refreshing profile instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
