import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { TenantService } from '@/lib/tenant-service';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    const body = await request.json();
    const { tenantName } = body;

    if (!tenantName || typeof tenantName !== 'string') {
      return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
    }

    // Check if user already has a tenant
    const existingProfile = await TenantService.getUserProfile(decodedToken.uid);
    if (existingProfile) {
      return NextResponse.json({ error: 'User already has a tenant' }, { status: 400 });
    }

    // Create tenant and set user as admin
    const tenantId = await TenantService.createTenant(
      tenantName,
      decodedToken.uid,
      decodedToken.email || ''
    );

    return NextResponse.json({ 
      success: true, 
      tenantId,
      message: 'Tenant setup completed successfully' 
    });
  } catch (error) {
    console.error('Error completing tenant setup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
