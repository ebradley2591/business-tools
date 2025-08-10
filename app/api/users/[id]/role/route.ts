import { NextRequest, NextResponse } from 'next/server';
import { adminDb, auth } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const targetUserId = params.id;
    const body = await request.json();
    const { role } = body;

    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be "admin" or "user"' }, { status: 400 });
    }

    // Prevent self-role-change
    if (targetUserId === user.uid) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Get the user to verify they belong to the tenant
    const userRef = adminDb.collection('tenantUsers').doc(targetUserId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.tenant_id !== user.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized - User does not belong to your tenant' }, { status: 403 });
    }

    // Update user role in Firestore
    await userRef.update({
      role: role,
      updatedAt: new Date()
    });

    // Update Firebase Auth custom claims
    try {
      await auth.setCustomUserClaims(targetUserId, {
        tenant_id: user.tenant_id,
        role: role
      });
    } catch (error) {
      console.error('Error updating custom claims:', error);
      // Continue with role update even if claims update fails
    }

    return NextResponse.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
