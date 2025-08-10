import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    // Get tenant subscription info
    const tenantDoc = await adminDb.collection('tenants').doc(user.tenant_id).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

    // Get subscription info
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(user.tenant_id).get();
    const subscriptionData = subscriptionDoc.exists ? subscriptionDoc.data() : null;

    // Get current user count
    const usersRef = adminDb.collection('tenantUsers');
    const usersSnapshot = await usersRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    
    const currentUsers = usersSnapshot.size;

    // Determine user limits based on plan
    let maxUsers = 5; // Default free plan
    let plan = 'free';

    if (subscriptionData?.plan) {
      plan = subscriptionData.plan;
      switch (subscriptionData.plan) {
        case 'free':
          maxUsers = 5;
          break;
        case 'pro':
          maxUsers = 10;
          break;
        case 'enterprise':
          maxUsers = 50;
          break;
        default:
          maxUsers = 5;
      }
    }

    // If tenant has permanent access, determine plan and limits based on activation code type
    if (tenantData?.isPermanentAccess) {
      if (tenantData?.activationCodeType === 'early_adopter') {
        plan = 'pro';
        maxUsers = 10; // Pro plan limit
      } else if (tenantData?.activationCodeType === 'contributor') {
        plan = 'enterprise';
        maxUsers = 50; // Enterprise plan limit
      } else if (tenantData?.activationCodeType === 'dev') {
        plan = 'enterprise';
        maxUsers = 50; // Enterprise plan limit
      } else {
        // If no activation code type specified, default to enterprise
        plan = 'enterprise';
        maxUsers = 50;
      }
    }

    return NextResponse.json({
      maxUsers,
      currentUsers,
      plan,
      subscription_status: subscriptionData?.status || 'inactive'
    });
  } catch (error) {
    console.error('Error fetching license info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
