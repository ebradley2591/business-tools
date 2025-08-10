import { NextRequest, NextResponse } from 'next/server';
import { adminDb, auth } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const targetUserId = params.id;

    // Prevent self-removal
    if (targetUserId === user.uid) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 });
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

    // Remove user from tenant
    await userRef.delete();

    // Update Firebase Auth custom claims to remove tenant access
    try {
      await auth.setCustomUserClaims(targetUserId, {
        tenant_id: null,
        role: null
      });
    } catch (error) {
      console.error('Error updating custom claims:', error);
      // Continue with removal even if claims update fails
    }

    return NextResponse.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('Error removing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
