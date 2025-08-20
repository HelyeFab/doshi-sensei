import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    // For now, return a message that this should be handled by Firebase Functions
    // The actual implementation is in functions/src/admin-operations.ts
    return NextResponse.json(
      { 
        error: 'Account deletion should be handled through Firebase Functions',
        message: 'Please use the deleteAccount cloud function instead'
      },
      { status: 501 } // Not Implemented
    );
  } catch (error) {
    console.error('Error in delete-account route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}