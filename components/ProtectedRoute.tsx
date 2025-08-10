'use client';

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SubscriptionLockout from './SubscriptionLockout';
import ProfileSetupRequired from './ProfileSetupRequired';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Check if we're in the middle of activation
  useEffect(() => {
    const checkActivation = () => {
      const activationInProgress = localStorage.getItem('activationInProgress') === 'true';
      setIsActivating(activationInProgress);
    };
    
    checkActivation();
    // Check periodically during the first few seconds
    const interval = setInterval(checkActivation, 50); // Check more frequently
    setTimeout(() => clearInterval(interval), 15000); // Check for 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Reset retry count when user changes
  useEffect(() => {
    if (user) {
      setProfileRetryCount(0);
      setIsRetryingProfile(false);
    }
  }, [user?.uid]);

  if (loading || isActivating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Check if user has a profile (tenant setup completed)
  if (!userProfile) {
    // If we're still loading or activating, show loading spinner
    if (isActivating || loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    // If we haven't retried enough times yet, try to fetch the profile
    if (profileRetryCount < 3 && !isRetryingProfile) {
      setIsRetryingProfile(true);
      
      // Retry profile fetch
      setTimeout(async () => {
        try {
          await refreshUserProfile();
          // Since refreshUserProfile doesn't return a value, we'll assume it succeeded
          // and let the useEffect handle the profile state
        } catch (error) {
          setProfileRetryCount(prev => prev + 1);
        } finally {
          setIsRetryingProfile(false);
        }
      }, 1000 * (profileRetryCount + 1)); // Increasing delay: 1s, 2s, 3s
      
      // Show loading spinner during retry
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    // If we've exhausted all retries, show the modal
    if (profileRetryCount >= 3) {
      return <ProfileSetupRequired />;
    }
    
    // Still retrying, show loading spinner
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if tenant subscription is active
  if (userProfile.subscription_status !== 'active') {
    return <SubscriptionLockout />;
  }

  return <>{children}</>;
}
