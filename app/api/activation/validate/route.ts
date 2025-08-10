import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthTokenForActivation } from '@/lib/firebase-auth';
import { ActivationService } from '@/lib/activation-service';
import { TenantService } from '@/lib/tenant-service';

export async function POST(request: NextRequest) {
  console.log('=== ACTIVATION VALIDATION API CALLED ===');
  try {
    console.log('Verifying auth token...');
    const user = await verifyAuthTokenForActivation(request);
    
    if (!user) {
      console.log('❌ Auth token verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Auth token verified for user:', user.uid);

    const body = await request.json();
    const { code, tenantName, step } = body;
    
    console.log('Request body:', { code, tenantName, step });

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Activation code is required' }, { status: 400 });
    }

    if (!tenantName || typeof tenantName !== 'string') {
      return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
    }

    // Step-by-step activation process
    switch (step) {
      case 'verify-code':
        return await handleVerifyCode(code, user);
        
      case 'create-tenant':
        return await handleCreateTenant(tenantName, user, code);
        
      case 'apply-activation':
        return await handleApplyActivation(code, user, body.tenantId);
        
      case 'verify-completion':
        return await handleVerifyCompletion(user, body.tenantId);
        
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error validating activation code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleVerifyCode(code: string, user: { uid: string; email: string }) {
  console.log('=== STEP 1: Verifying activation code ===');
  
  // Check if user already has a tenant
  const existingProfile = await TenantService.getUserProfile(user.uid);
  if (existingProfile) {
    return NextResponse.json({ error: 'User already has a tenant' }, { status: 400 });
  }

  // Verify activation code exists and is valid
  const activationCode = await ActivationService.getActivationCode(code);
  if (!activationCode) {
    return NextResponse.json({ error: 'Invalid activation code' }, { status: 400 });
  }

  if (!activationCode.isActive) {
    return NextResponse.json({ error: 'Activation code is inactive' }, { status: 400 });
  }

  if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Activation code has expired' }, { status: 400 });
  }

  if (activationCode.maxUses && activationCode.currentUses >= activationCode.maxUses) {
    return NextResponse.json({ error: 'Activation code usage limit reached' }, { status: 400 });
  }

  if (activationCode.usedBy?.includes(user.uid)) {
    return NextResponse.json({ error: 'You have already used this activation code' }, { status: 400 });
  }

  console.log('✅ Activation code verified successfully');
  return NextResponse.json({ 
    success: true, 
    step: 'verify-code',
    nextStep: 'create-tenant',
    message: 'Activation code verified'
  });
}

async function handleCreateTenant(tenantName: string, user: { uid: string; email: string }, code: string) {
  console.log('=== STEP 2: Creating tenant ===');
  
  // Re-verify activation code
  const activationCode = await ActivationService.getActivationCode(code);
  if (!activationCode || !activationCode.isActive) {
    return NextResponse.json({ error: 'Activation code is no longer valid' }, { status: 400 });
  }

  // Create tenant
  const tenantId = await TenantService.createTenant(tenantName, user.uid, user.email);
  console.log('✅ Tenant created successfully:', tenantId);

  // Verify tenant was created
  const tenant = await TenantService.getTenant(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }

  // Verify user profile was created
  const userProfile = await TenantService.getUserProfile(user.uid);
  if (!userProfile) {
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
  }

  console.log('✅ Tenant and user profile verified');
  return NextResponse.json({ 
    success: true, 
    step: 'create-tenant',
    nextStep: 'apply-activation',
    tenantId,
    message: 'Tenant created successfully'
  });
}

async function handleApplyActivation(code: string, user: { uid: string; email: string }, tenantId: string) {
  console.log('=== STEP 3: Applying activation code ===');
  
  // Apply activation code
  const result = await ActivationService.validateAndUseCode(
    code,
    user.uid,
    tenantId,
    user.email,
    'Business Name' // We don't need the name here since tenant is already created
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  console.log('✅ Activation code applied successfully');
  return NextResponse.json({ 
    success: true, 
    step: 'apply-activation',
    nextStep: 'verify-completion',
    plan: result.plan,
    message: 'Activation code applied successfully'
  });
}

async function handleVerifyCompletion(user: { uid: string; email: string }, tenantId: string) {
  console.log('=== STEP 4: Verifying completion ===');
  
  // Wait for custom claims to propagate
  console.log('Waiting for custom claims to propagate...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify user profile is accessible and active
  const userProfile = await TenantService.getUserProfile(user.uid);
  if (!userProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 500 });
  }

  // Verify tenant is active
  const tenant = await TenantService.getTenant(tenantId);
  if (!tenant || tenant.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Tenant not active' }, { status: 500 });
  }

  // Verify subscription is active
  const subscription = await TenantService.getTenantSubscription(tenantId);
  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json({ error: 'Subscription not active' }, { status: 500 });
  }

  console.log('✅ All verifications passed - activation complete');
  return NextResponse.json({ 
    success: true, 
    step: 'verify-completion',
    nextStep: 'complete',
    profileReady: true,
    message: 'Activation completed successfully'
  });
}
