import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
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

    const inviteId = params.id;

    // Get the invite to verify it belongs to the tenant
    const inviteRef = adminDb.collection('tenantInvites').doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const inviteData = inviteDoc.data();
    if (inviteData?.tenant_id !== user.tenant_id) {
      return NextResponse.json({ error: 'Unauthorized - Invitation does not belong to your tenant' }, { status: 403 });
    }

    // Delete the invitation
    await inviteRef.delete();

    return NextResponse.json({ success: true, message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inviteId = params.id;
    
    if (!inviteId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    const inviteDoc = await adminDb.collection('tenantInvites').doc(inviteId).get();
    
    if (!inviteDoc.exists) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const inviteData = inviteDoc.data();
    
    // Check if invitation has expired
    const now = new Date();
    const expiresAt = inviteData?.expires_at?.toDate();
    const isExpired = expiresAt && now > expiresAt;

    // Get tenant name
    const tenantDoc = await adminDb.collection('tenants').doc(inviteData?.tenant_id).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

    // Get inviter name
    const inviterDoc = await adminDb.collection('tenantUsers').doc(inviteData?.invited_by).get();
    const inviterData = inviterDoc.exists ? inviterDoc.data() : null;

    const response = {
      id: inviteDoc.id,
      email: inviteData?.email,
      role: inviteData?.role,
      tenantName: tenantData?.name || 'Unknown Organization',
      invitedBy: inviterData?.name || inviterData?.email || 'Administrator',
      status: isExpired ? 'expired' : inviteData?.status,
      expiresAt: expiresAt,
      createdAt: inviteData?.createdAt?.toDate(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
