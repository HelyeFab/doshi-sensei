import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Validate API key (you should store this securely in env variables)
    const validApiKey = process.env.BUG_SYNC_API_KEY;
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

    // Build query
    let query = adminDb.collection('bugReports');
    
    // If not including all, only get unsynced or recently updated
    if (!includeAll && lastSyncTime) {
      const lastSync = new Date(lastSyncTime);
      query = query.where('updatedAt', '>', Timestamp.fromDate(lastSync)) as any;
    } else if (!includeAll) {
      // Get only unsynced reports
      query = query.where('obsidianSynced', '==', false) as any;
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const bugReports = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
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
      };
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
    if (apiKey !== validApiKey) {
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

    // Update each report to mark as synced
    const batch = adminDb.batch();
    const now = Timestamp.now();
    
    for (const id of reportIds) {
      const docRef = adminDb.collection('bugReports').doc(id);
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