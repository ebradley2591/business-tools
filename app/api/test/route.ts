import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Test Firebase connection
    await adminDb.collection('test').doc('connection').get();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Firebase connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
