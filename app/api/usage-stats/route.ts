import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuthToken } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer count
    const customersRef = adminDb.collection('customers');
    const customersSnapshot = await customersRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    const customerCount = customersSnapshot.size;

    // Get user count
    const usersRef = adminDb.collection('tenantUsers');
    const usersSnapshot = await usersRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    const userCount = usersSnapshot.size;

    // Get custom fields count
    const customFieldsRef = adminDb.collection('customFields');
    const customFieldsSnapshot = await customFieldsRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    const customFieldsCount = customFieldsSnapshot.size;

    return NextResponse.json({
      activeUsers: userCount,
      totalCustomers: customerCount,
      customFields: customFieldsCount,
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
