import { adminDb, auth } from '@/lib/firebase-admin';
import { Tenant, TenantUser, UserProfile, Subscription } from '@/types/tenant';


export class TenantService {
  /**
   * Create a new tenant and set the user as admin
   */
  static async createTenant(tenantName: string, adminUid: string, adminEmail: string): Promise<string> {
    console.log(`🏗️ Creating tenant: ${tenantName} for user: ${adminUid}`);
    const batch = adminDb.batch();
    
    // Create tenant document
    const tenantRef = adminDb.collection('tenants').doc();
    const tenantData: Omit<Tenant, 'id'> = {
      name: tenantName,
      createdAt: new Date(),
      updatedAt: new Date(),
      subscription_status: 'active',
      plan: 'free',
      settings: {
        maxUsers: 5,
        maxCustomers: 100,
        features: ['basic_search', 'csv_import', 'custom_fields']
      }
    };
    
    batch.set(tenantRef, tenantData);
    console.log(`📝 Tenant document created with ID: ${tenantRef.id}`);
    
    // Create tenant user record
    const tenantUserRef = adminDb.collection('tenantUsers').doc(adminUid);
    const tenantUserData: TenantUser = {
      uid: adminUid,
      tenant_id: tenantRef.id,
      role: 'admin',
      email: adminEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };
    
    batch.set(tenantUserRef, tenantUserData);
    console.log(`👤 Tenant user record created for UID: ${adminUid}`);
    
    // Create subscription record
    const subscriptionRef = adminDb.collection('subscriptions').doc(tenantRef.id);
    const subscriptionData: Subscription = {
      tenant_id: tenantRef.id,
      status: 'active',
      plan: 'free',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    batch.set(subscriptionRef, subscriptionData);
    console.log(`💳 Subscription record created for tenant: ${tenantRef.id}`);
    
    // Set custom claims on the user
    console.log(`🔐 Setting custom claims for user: ${adminUid}`);
    await auth.setCustomUserClaims(adminUid, {
      tenant_id: tenantRef.id,
      role: 'admin',
      subscription_status: 'active'
    });
    
    console.log(`💾 Committing batch...`);
    await batch.commit();
    console.log(`✅ Tenant creation complete. Tenant ID: ${tenantRef.id}`);
    return tenantRef.id;
  }

  /**
   * Get tenant information by tenant ID
   */
  static async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
      if (!tenantDoc.exists) return null;
      
      const data = tenantDoc.data();
      return {
        id: tenantDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate()
      } as Tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      return null;
    }
  }

  /**
   * Get user profile with tenant information
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      console.log(`🔍 Getting user profile for UID: ${uid}`);
      const userDoc = await adminDb.collection('tenantUsers').doc(uid).get();
      
      if (!userDoc.exists) {
        console.log(`❌ User document does not exist for UID: ${uid}`);
        return null;
      }
      
      const data = userDoc.data();
      console.log(`✅ User document found:`, { uid: data?.uid, tenant_id: data?.tenant_id, role: data?.role });
      
      // Get tenant information to include permanent access details
      if (!data) {
        console.log(`❌ User data is undefined for UID: ${uid}`);
        return null;
      }
      
      const tenantDoc = await adminDb.collection('tenants').doc(data.tenant_id).get();
      const tenantData = tenantDoc.exists ? tenantDoc.data() : null;
      
      if (!tenantDoc.exists) {
        console.log(`❌ Tenant document does not exist for tenant_id: ${data.tenant_id}`);
        return null;
      }
      
      console.log(`✅ Tenant document found:`, { tenant_id: data.tenant_id, subscription_status: tenantData?.subscription_status });
      
      return {
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
        lastLoginAt: data?.lastLoginAt?.toDate(),
        isPermanentAccess: tenantData?.isPermanentAccess || false,
        activationCodeType: tenantData?.activationCodeType,
        subscription_status: tenantData?.subscription_status || 'inactive',
        plan: tenantData?.plan || 'free',
        tenantName: tenantData?.name || 'Unknown Company'
      } as UserProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get tenant subscription status
   */
  static async getTenantSubscription(tenantId: string): Promise<Subscription | null> {
    try {
      const subscriptionDoc = await adminDb.collection('subscriptions').doc(tenantId).get();
      if (!subscriptionDoc.exists) return null;
      
      const data = subscriptionDoc.data();
      return {
        ...data,
        current_period_start: data?.current_period_start?.toDate(),
        current_period_end: data?.current_period_end?.toDate(),
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate()
      } as Subscription;
    } catch (error) {
      console.error('Error getting tenant subscription:', error);
      return null;
    }
  }

  /**
   * Check if tenant has active subscription
   */
  static async isTenantActive(tenantId: string): Promise<boolean> {
    const subscription = await this.getTenantSubscription(tenantId);
    return subscription?.status === 'active';
  }

  /**
   * Add user to tenant
   */
  static async addUserToTenant(
    tenantId: string, 
    uid: string, 
    email: string, 
    role: 'admin' | 'user' = 'user'
  ): Promise<void> {
    const batch = adminDb.batch();
    
    // Create tenant user record
    const tenantUserRef = adminDb.collection('tenantUsers').doc(uid);
    const tenantUserData: TenantUser = {
      uid,
      tenant_id: tenantId,
      role,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };
    
    batch.set(tenantUserRef, tenantUserData);
    
    // Get tenant subscription status
    const subscription = await this.getTenantSubscription(tenantId);
    
    // Set custom claims
    await auth.setCustomUserClaims(uid, {
      tenant_id: tenantId,
      role,
      subscription_status: subscription?.status || 'inactive'
    });
    
    await batch.commit();
  }

  /**
   * Update user's last login time
   */
  static async updateUserLastLogin(uid: string): Promise<void> {
    try {
      await adminDb.collection('tenantUsers').doc(uid).update({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user last login:', error);
    }
  }

  /**
   * Get all users for a tenant
   */
  static async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    try {
      const snapshot = await adminDb.collection('tenantUsers')
        .where('tenant_id', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastLoginAt: doc.data().lastLoginAt?.toDate()
      })) as TenantUser[];
    } catch (error) {
      console.error('Error getting tenant users:', error);
      return [];
    }
  }

  /**
   * Remove user from tenant
   */
  static async removeUserFromTenant(uid: string): Promise<void> {
    try {
      await adminDb.collection('tenantUsers').doc(uid).delete();
      
      // Clear custom claims
      await auth.setCustomUserClaims(uid, {});
    } catch (error) {
      console.error('Error removing user from tenant:', error);
    }
  }

  /**
   * Update tenant subscription status
   */
  static async updateTenantSubscription(
    tenantId: string, 
    status: Subscription['status'], 
    plan: Subscription['plan']
  ): Promise<void> {
    console.log(`🔄 Updating tenant subscription: ${tenantId} to ${status}/${plan}`);
    const batch = adminDb.batch();
    
    // Determine features based on plan
    let features: string[];
    let maxUsers: number;
    let maxCustomers: number;
    
    switch (plan) {
      case 'enterprise':
        features = [
          'basic_search',
          'csv_import', 
          'custom_fields',
          'bulk_delete',
          'advanced_analytics',
          'user_management',
          'audit_logs',
          'api_access',
          'priority_support'
        ];
        maxUsers = 50;
        maxCustomers = -1; // Unlimited
        break;
      case 'pro':
        features = [
          'basic_search',
          'csv_import',
          'custom_fields', 
          'bulk_delete',
          'user_management',
          'audit_logs'
        ];
        maxUsers = 10;
        maxCustomers = 1000;
        break;
      case 'free':
      default:
        features = [
          'basic_search',
          'csv_import',
          'custom_fields'
        ];
        maxUsers = 5;
        maxCustomers = 100;
        break;
    }
    
    // Update subscription
    const subscriptionRef = adminDb.collection('subscriptions').doc(tenantId);
    batch.update(subscriptionRef, {
      status,
      plan,
      updatedAt: new Date()
    });
    console.log(`📝 Updated subscription document`);
    
    // Update tenant with plan, features, and limits
    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    batch.update(tenantRef, {
      subscription_status: status,
      plan,
      settings: {
        maxUsers,
        maxCustomers,
        features
      },
      updatedAt: new Date()
    });
    console.log(`📝 Updated tenant document with ${features.length} features for ${plan} plan`);
    
    // Update all users' custom claims
    const users = await this.getTenantUsers(tenantId);
    console.log(`👥 Found ${users.length} users to update claims for`);
    for (const user of users) {
      console.log(`🔐 Updating custom claims for user: ${user.uid}`);
      await auth.setCustomUserClaims(user.uid, {
        tenant_id: tenantId,
        role: user.role,
        subscription_status: status,
        plan
      });
    }
    
    console.log(`💾 Committing subscription updates...`);
    await batch.commit();
    console.log(`✅ Subscription update complete`);
  }

  /**
   * Verify user has access to tenant
   */
  static async verifyUserAccess(uid: string, tenantId: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.tenant_id === tenantId;
    } catch (error) {
      console.error('Error verifying user access:', error);
      return false;
    }
  }

  /**
   * Check if user is admin of tenant
   */
  static async isUserAdmin(uid: string, tenantId: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.tenant_id === tenantId && userProfile?.role === 'admin';
    } catch (error) {
      console.error('Error checking if user is admin:', error);
      return false;
    }
  }
}
