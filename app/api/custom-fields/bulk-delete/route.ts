import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';
import { TenantService } from '@/lib/tenant-service';

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile to check plan and role
    const userProfile = await TenantService.getUserProfile(decodedToken.uid);
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user is admin and has Pro or Enterprise plan
    if (userProfile.role !== 'admin' || !(userProfile.plan === 'pro' || userProfile.plan === 'enterprise')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access and Pro/Enterprise plan required' }, { status: 403 });
    }

    // Get the custom field IDs from the request body
    const { customFieldIds } = await request.json();
    
    if (!customFieldIds || !Array.isArray(customFieldIds) || customFieldIds.length === 0) {
      return NextResponse.json({ error: 'No custom field IDs provided' }, { status: 400 });
    }

    console.log('Bulk delete custom fields: User:', userProfile.email, 'Plan:', userProfile.plan, 'Fields to delete:', customFieldIds.length);

    // Verify all custom fields belong to the user's tenant
    const customFieldsRef = adminDb.collection('customFields');
    const customFieldsSnapshot = await customFieldsRef
      .where('tenant_id', '==', userProfile.tenant_id)
      .where('__name__', 'in', customFieldIds)
      .get();

    if (customFieldsSnapshot.docs.length !== customFieldIds.length) {
      return NextResponse.json({ error: 'Some custom fields not found or do not belong to your tenant' }, { status: 400 });
    }

    // Create a batch for efficient deletion
    const batch = adminDb.batch();
    
    customFieldsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Execute the batch
    await batch.commit();

    console.log('Bulk delete custom fields: Successfully deleted', customFieldIds.length, 'custom fields');

    return NextResponse.json({ 
      success: true, 
      deleted: customFieldIds.length,
      message: `Successfully deleted ${customFieldIds.length} custom field${customFieldIds.length === 1 ? '' : 's'}`
    });

  } catch (error) {
    console.error('Bulk delete custom fields error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
