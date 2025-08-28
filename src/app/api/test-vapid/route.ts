import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
    vapidKeyLength: process.env.NEXT_PUBLIC_FCM_VAPID_KEY?.length,
    note: 'The VAPID key should match your Firebase Cloud Messaging settings. You can find it in Firebase Console > Project Settings > Cloud Messaging > Web configuration > Web Push certificates'
  });
}