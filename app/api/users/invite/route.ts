import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';
import { sendInviteEmailFallback } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check user limits
    const usersRef = adminDb.collection('tenantUsers');
    const usersSnapshot = await usersRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    
    const currentUsers = usersSnapshot.size;

    // Get subscription info to check limits
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(user.tenant_id).get();
    const subscriptionData = subscriptionDoc.exists ? subscriptionDoc.data() : null;

    // Get tenant info for permanent access
    const tenantDocForLimits = await adminDb.collection('tenants').doc(user.tenant_id).get();
    const tenantDataForLimits = tenantDocForLimits.exists ? tenantDocForLimits.data() : null;

    let maxUsers = 5; // Default free plan
    if (subscriptionData?.plan) {
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
      }
    }

    // If tenant has permanent access, use enterprise limits
    if (tenantDataForLimits?.isPermanentAccess) {
      maxUsers = 50;
    }

    if (currentUsers >= maxUsers) {
      return NextResponse.json({ 
        error: `User limit reached. You can only have ${maxUsers} users on your current plan.` 
      }, { status: 400 });
    }

    // Check if user already exists in this tenant
    const existingUserSnapshot = await usersRef
      .where('tenant_id', '==', user.tenant_id)
      .where('email', '==', email)
      .get();

    if (!existingUserSnapshot.empty) {
      return NextResponse.json({ error: 'User already exists in this organization' }, { status: 400 });
    }

    // Check if invite already exists
    const invitesRef = adminDb.collection('tenantInvites');
    const existingInviteSnapshot = await invitesRef
      .where('tenant_id', '==', user.tenant_id)
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .get();

    if (!existingInviteSnapshot.empty) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 });
    }

    // Get tenant name for email
    const tenantDocForEmail = await adminDb.collection('tenants').doc(user.tenant_id).get();
    const tenantDataForEmail = tenantDocForEmail.exists ? tenantDocForEmail.data() : null;
    const tenantName = tenantDataForEmail?.name || 'Your Organization';

    // Create invitation
    const inviteData = {
      tenant_id: user.tenant_id,
      email: email.toLowerCase().trim(),
      role: role,
      invited_by: user.uid,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
    };

    const inviteRef = await invitesRef.add(inviteData);

    // Send email invitation
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteRef.id}`;
    
    const emailData = {
      email: email.toLowerCase().trim(),
      role: role,
      tenantName: tenantName,
      invitedBy: user.email || 'Administrator',
      inviteUrl: inviteUrl
    };

    // Use fallback mode - log invitation details for manual sharing
    const emailResult = await sendInviteEmailFallback(emailData);

    console.log(`Invitation created for ${email} with role ${role}. Email sent: ${emailResult.success}`);

    return NextResponse.json({ 
      success: true, 
      inviteId: inviteRef.id,
      message: emailResult.success ? 'Invitation sent successfully' : 'Invitation created but email failed to send',
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
