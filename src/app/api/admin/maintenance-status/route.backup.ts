import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function GET(request: NextRequest) {
  try {
    // Only allow internal requests from middleware
    const isInternal = request.headers.get('x-internal-request') === 'true';
    if (!isInternal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const adminDb = admin.firestore();

    // Check Firestore for maintenance status
    const maintenanceDoc = await adminDb
      .collection('system')
      .doc('maintenance')
      .get();

    if (!maintenanceDoc.exists) {
      return NextResponse.json({ maintenanceMode: false });
    }

    const data = maintenanceDoc.data();
    
    return NextResponse.json({
      maintenanceMode: data?.enabled || false,
      message: data?.message,
      estimatedTime: data?.estimatedTime,
      activatedBy: data?.activatedBy,
      activatedAt: data?.activatedAt
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    // In case of error, return false to not block users
    return NextResponse.json({ maintenanceMode: false });
  }
}