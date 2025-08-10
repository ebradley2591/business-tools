import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
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

    const body = await request.json();
    const { name, type, required, options, defaultValue, description, order } = body;

    const customFieldRef = adminDb.collection('customFields').doc(params.id);
    const customFieldSnap = await customFieldRef.get();

    if (!customFieldSnap.exists) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    const customFieldData = customFieldSnap.data();
    
    // Verify custom field belongs to user's tenant
    if (customFieldData?.tenant_id !== user.tenant_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (required !== undefined) updateData.required = required;
    if (options !== undefined) updateData.options = type === 'select' ? options : undefined;
    if (defaultValue !== undefined) updateData.defaultValue = defaultValue;
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (order !== undefined) updateData.order = order;

    await customFieldRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating custom field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const customFieldRef = adminDb.collection('customFields').doc(params.id);
    const customFieldSnap = await customFieldRef.get();

    if (!customFieldSnap.exists) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    const customFieldData = customFieldSnap.data();
    
    // Verify custom field belongs to user's tenant
    if (customFieldData?.tenant_id !== user.tenant_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await customFieldRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
