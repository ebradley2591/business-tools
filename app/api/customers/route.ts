import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Customers GET endpoint called');
    
    // Use proper tenant authentication
    const user = await verifyTenantAdminAccess(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    console.log('Getting customers for tenant:', user.tenant_id);
    
    // Implement pagination to get all customers for this tenant
    let allCustomers: any[] = [];
    let lastDoc = null;
    const QUERY_LIMIT = 500; // Firestore recommended batch size
    
    // First query
    let customersQuery = adminDb.collection('customers')
      .where('tenant_id', '==', user.tenant_id)
      .limit(QUERY_LIMIT);
    
    let snapshot = await customersQuery.get();
    
    // Add first batch to our array
    snapshot.docs.forEach(doc => {
      allCustomers.push(doc);
    });
    
    // Continue fetching while we have more documents
    while (snapshot.docs.length === QUERY_LIMIT) {
      // Get the last document from previous batch
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      // Set up query for next batch starting after last doc
      customersQuery = adminDb.collection('customers')
        .where('tenant_id', '==', user.tenant_id)
        .startAfter(lastDoc)
        .limit(QUERY_LIMIT);
      
      // Get next batch
      snapshot = await customersQuery.get();
      
      // Add this batch to our array
      snapshot.docs.forEach(doc => {
        allCustomers.push(doc);
      });
    }
    
    console.log('Found', allCustomers.length, 'customers for tenant', user.tenant_id);
    
    const customers = allCustomers.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(0),
        updatedAt: data.updatedAt?.toDate?.() || new Date(0),
        ownershipHistory: data.ownershipHistory?.map((record: any) => ({
          ...record,
          timestamp: record.timestamp?.toDate?.() || new Date(0),
        })) || [],
      };
    });

    // Sort by createdAt in memory if available, otherwise by document ID
    customers.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.id.localeCompare(a.id);
    });

    console.log('Returning', customers.length, 'customers for tenant', user.tenant_id);
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use proper tenant authentication
    const user = await verifyTenantAdminAccess(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, email, secondaryContactName, secondaryContactPhone, tags, customFields, ownershipHistory } = body;

    // Validate required fields
    if (!name || !phone || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const customerData = {
      tenant_id: user.tenant_id, // Use proper tenant_id from authenticated user
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      email: email?.trim() || '',
      secondaryContactName: secondaryContactName?.trim() || '',
      secondaryContactPhone: secondaryContactPhone?.trim() || '',
      tags: tags || [],
      customFields: customFields || {},
      ownershipHistory: ownershipHistory || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('customers').add(customerData);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...customerData 
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
