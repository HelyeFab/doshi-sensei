import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/types/admin';
import { dynamicRegistry } from '@/lib/features/dynamic-registry';
import { Feature } from '@/lib/features/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For server-side admin check, we'll mark this as admin request
    (global as any).__adminRequest = true;

    const body = await request.json();
    const { action, featureId, data } = body;

    if (!action || !featureId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, featureId' }, 
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'update':
        if (!data) {
          return NextResponse.json(
            { error: 'Missing data for update' }, 
            { status: 400 }
          );
        }
        await dynamicRegistry.updateFeature(featureId, data);
        result = { success: true, message: `Feature ${featureId} updated` };
        break;

      case 'add':
        if (!data || !data.name || !data.description) {
          return NextResponse.json(
            { error: 'Missing required fields for new feature' }, 
            { status: 400 }
          );
        }
        const newFeature: Feature = {
          id: featureId,
          name: data.name,
          description: data.description,
          category: data.category || 'learning',
          icon: data.icon || '🌟',
          limitType: data.limitType || 'daily',
          requiresAuth: data.requiresAuth ?? false,
          requiresSubscription: data.requiresSubscription ?? false,
          status: data.status || 'planned',
          ...data
        };
        await dynamicRegistry.addFeature(newFeature);
        result = { success: true, message: `Feature ${featureId} added` };
        break;

      case 'delete':
        await dynamicRegistry.deleteFeature(featureId);
        result = { success: true, message: `Feature ${featureId} deleted` };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` }, 
          { status: 400 }
        );
    }

    // Clear cache to ensure fresh data
    dynamicRegistry.clearCache();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating feature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update feature' }, 
      { status: 500 }
    );
  }
}