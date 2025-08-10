'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useUserRole } from '@/hooks/useUserRole';
import { Users, CreditCard, Shield, HelpCircle } from 'lucide-react';
import SupportModal from './SupportModal';

export default function Navigation() {
  const { user, userProfile, logout } = useAuth();
  const { isTenantAdmin, isToolAdmin, isTenantActive, canManageUsers, canAccessBilling, canManageActivationCodes } = useUserRole();
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                {userProfile?.tenantName || 'Smart Customer Directory'}
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              

              
              

              {canManageUsers && (
                <Link
                  href="/users"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Users
                </Link>
              )}

              {canManageActivationCodes && (
                <Link
                  href="/admin/activation-codes"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Activation Codes
                </Link>
              )}

              {canAccessBilling && (
                <Link
                  href="/billing"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Billing
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSupportModal(true)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Support
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{user?.email}</span>
                {isTenantAdmin && (
                  <Shield className="h-4 w-4 text-blue-500" />
                )}
                {isToolAdmin && (
                  <Shield className="h-4 w-4 text-purple-500" />
                )}
                {!isTenantActive && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <SupportModal 
        isOpen={showSupportModal} 
        onClose={() => setShowSupportModal(false)} 
      />
    </nav>
  );
}
