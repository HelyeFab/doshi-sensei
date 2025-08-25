/**
 * Webhook Health Check Endpoint
 * 
 * Monitors the health of Stripe webhook processing
 * Checks for recent successful events and alerts on failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Health check thresholds
const WARNING_THRESHOLD_MINUTES = 60; // Warn if no events in 60 minutes
const ERROR_THRESHOLD_MINUTES = 240; // Error if no events in 4 hours
const FAILURE_RATE_THRESHOLD = 0.1; // Error if >10% failure rate

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({
        status: 'error',
        message: 'Database not initialized',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Get recent webhook events
    const now = new Date();
    const checkWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    const eventsRef = collection(db, 'webhook_logs');
    const recentEventsQuery = query(
      eventsRef,
      where('timestamp', '>=', Timestamp.fromDate(checkWindow)),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(recentEventsQuery);
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate statistics
    const totalEvents = events.length;
    const successfulEvents = events.filter((e: any) => e.status === 'success').length;
    const failedEvents = events.filter((e: any) => e.status === 'error').length;
    const failureRate = totalEvents > 0 ? failedEvents / totalEvents : 0;
    
    // Get last successful event
    const lastSuccessful = events.find((e: any) => e.status === 'success');
    const lastSuccessTime = lastSuccessful ? 
      (lastSuccessful as any).timestamp?.toDate?.() || new Date((lastSuccessful as any).timestamp) 
      : null;
    
    // Calculate time since last success
    const minutesSinceLastSuccess = lastSuccessTime ? 
      Math.floor((now.getTime() - new Date(lastSuccessTime).getTime()) / (1000 * 60)) 
      : Infinity;
    
    // Determine health status
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    let issues: string[] = [];
    
    if (minutesSinceLastSuccess > ERROR_THRESHOLD_MINUTES) {
      status = 'error';
      issues.push(`No successful events in ${minutesSinceLastSuccess} minutes`);
    } else if (minutesSinceLastSuccess > WARNING_THRESHOLD_MINUTES) {
      status = 'warning';
      issues.push(`No successful events in ${minutesSinceLastSuccess} minutes`);
    }
    
    if (failureRate > FAILURE_RATE_THRESHOLD) {
      status = 'error';
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }
    
    // Get event type distribution
    const eventTypes: Record<string, number> = {};
    events.forEach((e: any) => {
      const type = e.type || 'unknown';
      eventTypes[type] = (eventTypes[type] || 0) + 1;
    });
    
    // Check webhook endpoints
    const webhookEndpoints = {
      cloudFunction: 'https://stripewebhook-jtmxvmnera-uc.a.run.app',
      oldNextJs: '/api/stripe-webhook (DISABLED)'
    };
    
    return NextResponse.json({
      status,
      timestamp: now.toISOString(),
      endpoints: webhookEndpoints,
      statistics: {
        last24Hours: {
          total: totalEvents,
          successful: successfulEvents,
          failed: failedEvents,
          failureRate: `${(failureRate * 100).toFixed(1)}%`
        },
        lastSuccess: lastSuccessTime ? {
          timestamp: lastSuccessTime,
          minutesAgo: minutesSinceLastSuccess,
          eventId: lastSuccessful?.id
        } : null,
        eventTypes
      },
      issues: issues.length > 0 ? issues : undefined,
      recommendations: getRecommendations(status, issues, minutesSinceLastSuccess)
    });
    
  } catch (error) {
    console.error('Webhook health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check webhook health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getRecommendations(
  status: string, 
  issues: string[], 
  minutesSinceLastSuccess: number
): string[] {
  const recommendations: string[] = [];
  
  if (status === 'error') {
    recommendations.push('⚠️ URGENT: Check Stripe Dashboard for webhook configuration');
    recommendations.push('Verify Cloud Function is running: gcloud run services list');
    recommendations.push('Check Cloud Function logs: gcloud functions logs read stripeWebhook');
  }
  
  if (minutesSinceLastSuccess > WARNING_THRESHOLD_MINUTES) {
    recommendations.push('Consider implementing webhook retry logic');
    recommendations.push('Set up alerting for webhook failures');
  }
  
  if (issues.some(i => i.includes('failure rate'))) {
    recommendations.push('Review failed webhook events in Firestore');
    recommendations.push('Check for API version mismatches');
    recommendations.push('Verify webhook signing secret is correct');
  }
  
  return recommendations;
}