import { useAuth } from '@/components/AuthProvider';

export function useUserRole() {
  const { userProfile, isAdmin, isTenantActive } = useAuth();

  // If userProfile is null, user likely needs to complete tenant setup
  // Default to false for all permissions to prevent unauthorized access
  const isTenantAdmin = userProfile ? (userProfile.role === 'admin' && isTenantActive) : false;
  const isToolAdmin = userProfile ? (userProfile.role === 'tool_admin' && isTenantActive) : false;
  const canManageUsers = userProfile ? (isTenantAdmin && isTenantActive) : false;
  const canManageSettings = userProfile ? (isTenantAdmin && isTenantActive) : false;
  const canImportData = userProfile ? (isTenantAdmin && isTenantActive) : false;
  const canExportData = userProfile ? (isTenantAdmin && isTenantActive) : false;
  const canViewCustomers = userProfile ? isTenantActive : false;
  const canSearchCustomers = userProfile ? isTenantActive : false;
  const canAccessBilling = userProfile ? (isTenantAdmin && isTenantActive) : false;
  const canManageActivationCodes = userProfile ? (isToolAdmin && isTenantActive) : false;
  
  // Bulk delete is available for Pro and Enterprise plans (tenant admins only)
  const canBulkDelete = userProfile ? (isTenantAdmin && isTenantActive && 
    (userProfile.plan === 'pro' || userProfile.plan === 'enterprise')) : false;

  return {
    userProfile,
    isAdmin,
    isTenantActive,
    isTenantAdmin,
    isToolAdmin,
    canManageUsers,
    canManageSettings,
    canImportData,
    canExportData,
    canViewCustomers,
    canSearchCustomers,
    canAccessBilling,
    canManageActivationCodes,
    canBulkDelete,
  };
}
