import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

// Verify admin access
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.substring(7);
  const admin = await getFirebaseAdmin();
  const decodedToken = await admin.auth().verifyIdToken(token);

  const isAdmin = decodedToken.admin === true || decodedToken.email === 'emmanuelfabiani23@gmail.com';

  if (!isAdmin) {
    throw new Error('Insufficient permissions');
  }

  return decodedToken;
}

export async function GET(request: NextRequest) {
  try {
    await verifyAdmin(request);
    
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Get webhook events from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Check if we have webhook_logs collection
    let webhookLogs: any[] = [];
    let webhookEvents: any[] = [];
    
    try {
      // Try to get webhook logs (if they exist)
      const logsSnapshot = await db.collection('webhook_logs')
        .where('timestamp', '>=', twentyFourHoursAgo)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      webhookLogs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {

    }
    
    try {
      // Try to get webhook events (for idempotency)
      const eventsSnapshot = await db.collection('webhook_events')
        .where('processedAt', '>=', twentyFourHoursAgo)
        .orderBy('processedAt', 'desc')
        .limit(100)
        .get();
      
      webhookEvents = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {

    }
    
    // Calculate statistics
    const allEvents = [...webhookLogs, ...webhookEvents];
    const totalEvents = allEvents.length;
    const successfulEvents = allEvents.filter((e: any) => 
      e.status === 'success' || e.success === true
    ).length;
    const failedEvents = totalEvents - successfulEvents;
    
    // Calculate average response time
    const responseTimes = allEvents
      .map((e: any) => e.responseTime || e.processingTime)
      .filter(Boolean);
    const averageResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    // Get last event time
    const lastEventTime = allEvents.length > 0
      ? allEvents[0].timestamp || allEvents[0].processedAt
      : null;
    
    // Count event types
    const eventTypeCounts: Record<string, number> = {};
    allEvents.forEach((event: any) => {
      const type = event.type || event.eventType || 'unknown';
      eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
    });
    
    // Format recent events
    const recentEvents = allEvents.slice(0, 10).map((event: any) => ({
      id: event.id,
      type: event.type || event.eventType || 'unknown',
      status: event.status === 'success' || event.success ? 'success' : 'failed',
      timestamp: event.timestamp || event.processedAt,
      responseTime: event.responseTime || event.processingTime,
      error: event.error || event.errorMessage,
    }));
    
    // Determine health status
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) : 1;
    const healthStatus = successRate >= 0.95 ? 'healthy' : 
                        successRate >= 0.8 ? 'degraded' : 'critical';
    
    return NextResponse.json({
      totalEvents,
      successfulEvents,
      failedEvents,
      averageResponseTime,
      lastEventTime,
      recentEvents,
      eventTypeCounts,
      healthStatus,
    });
    
  } catch (error) {
    console.error('Error in webhook monitoring:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch webhook stats';
    const statusCode = errorMessage.includes('authorization') || errorMessage.includes('permissions') ? 403 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}