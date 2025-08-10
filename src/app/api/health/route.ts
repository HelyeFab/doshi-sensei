import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
    };

    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    const adminDb = admin.firestore();

    // Check database connectivity
    try {
      // Simple read to verify Firebase connection
      await adminDb.collection('system').doc('health').get();
      health['database'] = 'connected';
    } catch (dbError) {
      health['database'] = 'disconnected';
      health.status = 'degraded';
    }

    // Check if maintenance mode is active
    try {
      const maintenanceDoc = await adminDb
        .collection('system')
        .doc('maintenance')
        .get();
      
      const maintenanceData = maintenanceDoc.data();
      if (maintenanceData?.enabled) {
        return NextResponse.json(
          {
            ...health,
            status: 'maintenance',
            maintenanceMessage: maintenanceData.message,
            estimatedTime: maintenanceData.estimatedTime
          },
          { status: 503 }
        );
      }
    } catch (error) {
      console.error('Error checking maintenance:', error);
    }

    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 503 }
    );
  }
}

// HEAD method for lightweight monitoring
export async function HEAD() {
  try {
    // Quick check without database query
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}