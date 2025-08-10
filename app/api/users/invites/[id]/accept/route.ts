import { NextRequest, NextResponse } from 'next/server';
import { adminDb, auth } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
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
    
    if (!inviteData) {
      return NextResponse.json({ error: 'Invalid invitation data' }, { status: 400 });
    }
    
    // Check if invitation has expired
    const now = new Date();
    const expiresAt = inviteData.expires_at?.toDate();
    if (expiresAt && now > expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if invitation is already accepted
    if (inviteData.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    // Get the request body for user registration
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    // Verify email matches invitation
    if (email.toLowerCase().trim() !== inviteData.email?.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 });
    }

    // Check user limits
    const usersRef = adminDb.collection('tenantUsers');
    const usersSnapshot = await usersRef
      .where('tenant_id', '==', inviteData.tenant_id)
      .get();
    
    const currentUsers = usersSnapshot.size;

    // Get subscription info to check limits
    const subscriptionDoc = await adminDb.collection('subscriptions').doc(inviteData.tenant_id).get();
    const subscriptionData = subscriptionDoc.exists ? subscriptionDoc.data() : null;

    // Get tenant info for permanent access
    const tenantDoc = await adminDb.collection('tenants').doc(inviteData.tenant_id).get();
    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

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
    if (tenantData?.isPermanentAccess) {
      maxUsers = 50;
    }

    if (currentUsers >= maxUsers) {
      return NextResponse.json({ 
        error: `User limit reached. The organization can only have ${maxUsers} users on their current plan.` 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUserSnapshot = await usersRef
      .where('tenant_id', '==', inviteData.tenant_id)
      .where('email', '==', email.toLowerCase().trim())
      .get();

    if (!existingUserSnapshot.empty) {
      return NextResponse.json({ error: 'User already exists in this organization' }, { status: 400 });
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      displayName: name,
    });

    // Set custom claims for the user
    await auth.setCustomUserClaims(userRecord.uid, {
      tenant_id: inviteData.tenant_id,
      role: inviteData.role,
    });

    // Add user to tenantUsers collection
    const userData = {
      uid: userRecord.uid,
      tenant_id: inviteData.tenant_id,
      email: email.toLowerCase().trim(),
      name: name,
      role: inviteData.role,
      status: 'active',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    await usersRef.doc(userRecord.uid).set(userData);

    // Update invitation status to accepted
    await adminDb.collection('tenantInvites').doc(inviteId).update({
      status: 'accepted',
      accepted_at: new Date(),
      accepted_by: userRecord.uid,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully. You can now log in.',
      userId: userRecord.uid
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('email already exists')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }
      if (error.message.includes('password')) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
