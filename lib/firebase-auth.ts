import { auth } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';
import { TenantService } from '@/lib/tenant-service';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  tenant_id: string;
  role: 'admin' | 'user' | 'tool_admin';
  subscription_status: 'active' | 'inactive';
  plan: 'free' | 'pro' | 'enterprise';
}

export async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user profile to ensure we have tenant information
    const userProfile = await TenantService.getUserProfile(decodedToken.uid);
    if (!userProfile) {
      console.error('User profile not found for UID:', decodedToken.uid);
      return null;
    }

    // Check if tenant is active
    const isTenantActive = await TenantService.isTenantActive(userProfile.tenant_id);
    if (!isTenantActive) {
      console.error('Tenant is inactive for UID:', decodedToken.uid);
      return null;
    }

    // Update last login time
    await TenantService.updateUserLastLogin(decodedToken.uid);

    return {
      uid: decodedToken.uid,
      email: userProfile.email,
      tenant_id: userProfile.tenant_id,
      role: userProfile.role,
      subscription_status: isTenantActive ? 'active' : 'inactive',
      plan: userProfile.plan
    };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

export async function verifyAuthTokenForActivation(request: NextRequest): Promise<{ uid: string; email: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || ''
    };
  } catch (error) {
    console.error('Error verifying auth token for activation:', error);
    return null;
  }
}

export async function verifyAdminAccess(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await verifyAuthToken(request);
  if (!user || (user.role !== 'admin' && user.role !== 'tool_admin')) {
    return null;
  }
  return user;
}

export async function verifyTenantAdminAccess(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await verifyAuthToken(request);
  if (!user || (user.role !== 'admin' && user.role !== 'tool_admin')) {
    return null;
  }
  return user;
}

export async function verifyToolAdminAccess(request: NextRequest): Promise<AuthenticatedUser | null> {
  const user = await verifyAuthToken(request);
  if (!user || user.role !== 'tool_admin') {
    return null;
  }
  return user;
}

export async function verifyTenantAccess(request: NextRequest, tenantId: string): Promise<AuthenticatedUser | null> {
  const user = await verifyAuthToken(request);
  if (!user || user.tenant_id !== tenantId) {
    return null;
  }
  return user;
}
