export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  subscription_status: 'active' | 'inactive';
  plan: 'free' | 'pro' | 'enterprise';
  isPermanentAccess?: boolean; // Flag for activation code access
  activationCodeType?: 'dev' | 'early_adopter' | 'contributor'; // Type of activation code used
  settings?: {
    maxUsers?: number;
    maxCustomers?: number;
    features?: string[];
  };
}

export interface TenantUser {
  uid: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'tool_admin';
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Subscription {
  tenant_id: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  plan: 'free' | 'pro' | 'enterprise';
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: 'admin' | 'user' | 'tool_admin';
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: Date;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  tenant_id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user' | 'tool_admin';
  subscription_status: 'active' | 'inactive';
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isPermanentAccess?: boolean; // Inherited from tenant
  activationCodeType?: 'dev' | 'early_adopter' | 'contributor'; // Inherited from tenant
  tenantName?: string; // Company/tenant name
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}
