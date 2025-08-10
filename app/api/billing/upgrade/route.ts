import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';
import { TenantService } from '@/lib/tenant-service';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId || !['free', 'pro', 'enterprise'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Update tenant subscription
    await TenantService.updateTenantSubscription(
      user.tenant_id,
      'active', // For demo purposes, always set to active
      planId as 'free' | 'pro' | 'enterprise'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Plan upgraded successfully',
      plan: planId
    });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
