import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function DELETE(request: NextRequest) {
  try {
    console.log('Bulk delete customers endpoint called');
    
    // Use proper tenant authentication
    const user = await verifyTenantAdminAccess(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    // Check if user has Pro or Enterprise plan
    if (user.plan !== 'pro' && user.plan !== 'enterprise') {
      console.log('User does not have Pro or Enterprise plan. Current plan:', user.plan);
      return NextResponse.json({ error: 'Forbidden - Pro or Enterprise plan required for bulk delete' }, { status: 403 });
    }

    const body = await request.json();
    const { customerIds } = body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: 'Invalid customer IDs provided' }, { status: 400 });
    }

    console.log('Deleting', customerIds.length, 'customers for tenant:', user.tenant_id);

    // Verify all customers belong to the user's tenant before deleting
    const customersToDelete = [];
    for (const customerId of customerIds) {
      const customerRef = adminDb.collection('customers').doc(customerId);
      const customerSnap = await customerRef.get();
      
      if (!customerSnap.exists) {
        console.log('Customer not found:', customerId);
        continue;
      }
      
      const customerData = customerSnap.data();
      if (!customerData) {
        console.log('Customer data is null:', customerId);
        continue;
      }
      if (customerData.tenant_id !== user.tenant_id) {
        console.log('Customer belongs to different tenant:', customerId, customerData.tenant_id, 'vs', user.tenant_id);
        continue;
      }
      
      customersToDelete.push(customerId);
    }

    if (customersToDelete.length === 0) {
      return NextResponse.json({ error: 'No valid customers found for deletion' }, { status: 400 });
    }

    // Use a batch to delete multiple customers
    const batch = adminDb.batch();
    
    for (const customerId of customersToDelete) {
      const customerRef = adminDb.collection('customers').doc(customerId);
      batch.delete(customerRef);
    }

    await batch.commit();
    
    console.log('Successfully deleted', customersToDelete.length, 'customers for tenant:', user.tenant_id);
    return NextResponse.json({ 
      success: true, 
      deletedCount: customersToDelete.length 
    });
  } catch (error) {
    console.error('Error bulk deleting customers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
