import { NextRequest, NextResponse } from 'next/server';
import { verifyToolAdminAccess } from '@/lib/firebase-auth';
import { ActivationService } from '@/lib/activation-service';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyToolAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tool Admin access required' }, { status: 401 });
    }

    const activationCodes = await ActivationService.getAllActivationCodes();
    
    return NextResponse.json(activationCodes);
  } catch (error) {
    console.error('Error getting activation codes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToolAdminAccess(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Tool Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { type, description, maxUses, expiresAt } = body;

    if (!type || !['dev', 'early_adopter', 'contributor'].includes(type)) {
      return NextResponse.json({ error: 'Invalid activation code type' }, { status: 400 });
    }

    const activationCode = await ActivationService.createActivationCode(
      type,
      description,
      maxUses,
      expiresAt ? new Date(expiresAt) : undefined,
      user.uid
    );

    return NextResponse.json(activationCode);
  } catch (error) {
    console.error('Error creating activation code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
