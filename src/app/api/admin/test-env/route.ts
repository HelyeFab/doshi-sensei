import { NextResponse } from 'next/server';

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  return NextResponse.json({
    hasAdminEmail: !!adminEmail,
    adminEmailLength: adminEmail?.length || 0,
    firstThreeChars: adminEmail ? adminEmail.substring(0, 3) : 'NOT_SET',
    domain: adminEmail ? adminEmail.split('@')[1] : 'NOT_SET',
    fullEmail: adminEmail || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
  });
}