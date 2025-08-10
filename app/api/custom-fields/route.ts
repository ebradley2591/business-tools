import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuthToken, verifyTenantAdminAccess } from '@/lib/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Scope custom fields to user's tenant
    const customFieldsRef = adminDb.collection('customFields');
    const snapshot = await customFieldsRef
      .where('tenant_id', '==', user.tenant_id)
      .get();
    
    // Sort in memory to avoid requiring a composite index
    const customFields = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          order: data.order || 0,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return NextResponse.json(customFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTenantAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tenant Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, required, options, defaultValue, description } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if a custom field with this name already exists for this tenant
    const existingFieldQuery = await adminDb.collection('customFields')
      .where('tenant_id', '==', user.tenant_id)
      .where('name', '==', name.trim())
      .limit(1)
      .get();
    
    if (!existingFieldQuery.empty) {
      return NextResponse.json({ 
        error: `A custom field with the name '${name.trim()}' already exists` 
      }, { status: 409 });
    }

    // Get the next order number for this tenant
    const existingFields = await adminDb.collection('customFields')
      .where('tenant_id', '==', user.tenant_id)
      .get();
    
    // Sort in memory to avoid requiring a composite index
    const sortedFields = existingFields.docs
      .map(doc => doc.data())
      .sort((a, b) => (b.order || 0) - (a.order || 0));
    
    const nextOrder = sortedFields.length === 0 ? 1 : (sortedFields[0].order || 0) + 1;

    const customFieldData: any = {
      tenant_id: user.tenant_id, // Add tenant_id to custom field
      name: name.trim(),
      type,
      required: required || false,
      defaultValue: defaultValue || null,
      description: description?.trim() || '',
      order: nextOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only add options field if type is 'select'
    if (type === 'select') {
      customFieldData.options = options || [];
    }

    const docRef = await adminDb.collection('customFields').add(customFieldData);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...customFieldData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
