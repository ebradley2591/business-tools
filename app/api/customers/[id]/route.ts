import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Customer GET endpoint called for ID:', params.id);
    
    // Use proper tenant authentication
    const user = await verifyTenantAdminAccess(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const customerRef = adminDb.collection('customers').doc(params.id);
    const customerSnap = await customerRef.get();

    if (!customerSnap.exists) {
      console.log('Customer not found:', params.id);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerSnap.data();
    if (!customerData) {
      console.log('Customer data is null:', params.id);
      return NextResponse.json({ error: 'Customer data not found' }, { status: 404 });
    }
    
    // Verify tenant ownership
    if (customerData.tenant_id !== user.tenant_id) {
      console.log('Customer belongs to different tenant:', customerData.tenant_id, 'vs', user.tenant_id);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    console.log('Customer data retrieved successfully for tenant:', user.tenant_id);

    return NextResponse.json({
      id: customerSnap.id,
      ...customerData,
      createdAt: customerData?.createdAt?.toDate?.() || new Date(0),
      updatedAt: customerData?.updatedAt?.toDate?.() || new Date(0),
      ownershipHistory: customerData?.ownershipHistory?.map((record: any) => ({
        ...record,
        timestamp: record.timestamp?.toDate?.() || new Date(0),
      })) || [],
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Customer PUT endpoint called for ID:', params.id);
    
    // Use proper tenant authentication
    const user = await verifyTenantAdminAccess(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, email, secondaryContactName, secondaryContactPhone, tags, customFields, ownershipHistory } = body;

    const customerRef = adminDb.collection('customers').doc(params.id);
    const customerSnap = await customerRef.get();

    if (!customerSnap.exists) {
      console.log('Customer not found:', params.id);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerSnap.data();
    if (!customerData) {
      console.log('Customer data is null:', params.id);
      return NextResponse.json({ error: 'Customer data not found' }, { status: 404 });
    }
    
    // Verify tenant ownership
    if (customerData.tenant_id !== user.tenant_id) {
      console.log('Customer belongs to different tenant:', customerData.tenant_id, 'vs', user.tenant_id);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (email !== undefined) updateData.email = email?.trim() || '';
    if (secondaryContactName !== undefined) updateData.secondaryContactName = secondaryContactName?.trim() || '';
    if (secondaryContactPhone !== undefined) updateData.secondaryContactPhone = secondaryContactPhone?.trim() || '';
    if (tags !== undefined) updateData.tags = tags;
    if (customFields !== undefined) updateData.customFields = customFields;
    if (ownershipHistory !== undefined) updateData.ownershipHistory = ownershipHistory;

    await customerRef.update(updateData);
    console.log('Customer updated successfully for tenant:', user.tenant_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Customer DELETE endpoint called for ID:', params.id);
    
    // Use proper tenant authentication
    const user = await verifyTenantAdminAccess(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const customerRef = adminDb.collection('customers').doc(params.id);
    const customerSnap = await customerRef.get();

    if (!customerSnap.exists) {
      console.log('Customer not found:', params.id);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerSnap.data();
    if (!customerData) {
      console.log('Customer data is null:', params.id);
      return NextResponse.json({ error: 'Customer data not found' }, { status: 404 });
    }
    
    // Verify tenant ownership
    if (customerData.tenant_id !== user.tenant_id) {
      console.log('Customer belongs to different tenant:', customerData.tenant_id, 'vs', user.tenant_id);
      return NextResponse.json({ error: 'Customer data not found' }, { status: 404 });
    }

    await customerRef.delete();
    console.log('Customer deleted successfully for tenant:', user.tenant_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
