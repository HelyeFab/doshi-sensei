import { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase';
import { ADMIN_EMAIL } from '@/types/admin';

export async function adminGuard(request: NextRequest): Promise<{ isAdmin: boolean }> {
  try {
    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { isAdmin: false };
    }

    // For server-side admin check
    (global as any).__adminRequest = true;
    
    // In production, we would verify the token here
    // For now, we'll use the same pattern as other admin routes
    return { isAdmin: true };
  } catch (error) {
    console.error('Admin guard error:', error);
    return { isAdmin: false };
  }
}