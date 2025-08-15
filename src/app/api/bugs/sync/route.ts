import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

interface BugReport {
  id: string;
  category: 'bug' | 'feedback' | 'feature' | 'support';
  title: string;
  description: string;
  userEmail: string;
  userName: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  timestamp: any;
  status: string;
  priority: string;
  assignee?: string;
  tags: string[];
  adminNotes: any[];
  obsidianId?: string;
  obsidianSynced: boolean;
  obsidianLastSync?: any;
  createdAt: any;
  updatedAt: any;
}

export async function GET(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {

    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Validate API key
    const validApiKey = process.env.BUG_SYNC_API_KEY;
    if (!validApiKey) {
      console.error('[Bug Sync API] ERROR: BUG_SYNC_API_KEY not set in environment variables!');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    if (apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const lastSyncTime = searchParams.get('lastSync');
    const includeAll = searchParams.get('all') === 'true';

    // Initialize Firebase Admin
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    // Build query
    let query = db.collection('bugReports');
    
    // If not including all, only get unsynced or recently updated
    if (!includeAll && lastSyncTime) {
      const lastSync = new Date(lastSyncTime);
      const lastSyncTimestamp = admin.firestore.Timestamp.fromDate(lastSync);
      query = query.where('updatedAt', '>', lastSyncTimestamp) as any;
    } else if (!includeAll) {
      // Get only unsynced reports
      query = query.where('obsidianSynced', '==', false) as any;
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const bugReports: BugReport[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as BugReport;
      bugReports.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        obsidianLastSync: data.obsidianLastSync?.toDate?.()?.toISOString() || null,
        // Convert admin notes timestamps
        adminNotes: data.adminNotes?.map((note: any) => ({
          ...note,
          timestamp: note.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        })) || []
      } as BugReport);
    });

    return NextResponse.json({
      success: true,
      count: bugReports.length,
      lastSync: new Date().toISOString(),
      reports: bugReports
    });

  } catch (error) {
    console.error('Error fetching bug reports for sync:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Mark reports as synced
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const validApiKey = process.env.BUG_SYNC_API_KEY;
    if (!validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const { reportIds } = await request.json();
    
    if (!reportIds || !Array.isArray(reportIds)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();

    // Update each report to mark as synced
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();
    
    for (const id of reportIds) {
      const docRef = db.collection('bugReports').doc(id);
      batch.update(docRef, {
        obsidianSynced: true,
        obsidianLastSync: now
      });
    }
    
    await batch.commit();

    return NextResponse.json({
      success: true,
      syncedCount: reportIds.length,
      syncedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking reports as synced:', error);
    return NextResponse.json(
      { error: 'Failed to update sync status' },
      { status: 500 }
    );
  }
}