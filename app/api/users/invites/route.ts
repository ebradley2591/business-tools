import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    // Get pending invites for the tenant
    const invitesRef = adminDb.collection('tenantInvites');
    const snapshot = await invitesRef
      .where('tenant_id', '==', user.tenant_id)
      .where('status', '==', 'pending')
      .get();
    
    const invites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      expiresAt: doc.data().expires_at?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    }));

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
