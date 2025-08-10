'use client';

import { useAuth } from '@/components/AuthProvider';
import LoginForm from '@/components/LoginForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Smart Customer Directory
          </h1>
          <p className="text-gray-600">
            Secure customer management for your business
          </p>
        </div>
        
        <LoginForm />
        
        <div className="text-center text-sm text-gray-500">
          <p>Protected by enterprise-grade security</p>
        </div>
      </div>
    </div>
  );
}
