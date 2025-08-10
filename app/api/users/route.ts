import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    // Get all users for the tenant
    const usersRef = adminDb.collection('tenantUsers');
    const snapshot = await usersRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastLoginAt: doc.data().lastLoginAt?.toDate(),
    }));

    // Get current user profile
    const currentUserDoc = await usersRef.doc(user.uid).get();
    const userProfile = currentUserDoc.exists ? {
      uid: currentUserDoc.id,
      ...currentUserDoc.data(),
      createdAt: currentUserDoc.data()?.createdAt?.toDate(),
      lastLoginAt: currentUserDoc.data()?.lastLoginAt?.toDate(),
    } : null;

    return NextResponse.json({ 
      users,
      userProfile
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
