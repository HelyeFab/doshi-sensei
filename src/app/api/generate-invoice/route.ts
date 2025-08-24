import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoiceService';
import { InvoiceData } from '@/components/invoice/InvoiceTemplate';
import { auth } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { invoiceData, userId } = await request.json();
    
    if (!invoiceData || !userId) {
      return NextResponse.json(
        { error: 'Missing invoice data or user ID' },
        { status: 400 }
      );
    }
    
    // Generate and upload the invoice PDF
    const pdfUrl = await InvoiceService.generateAndUploadInvoice(
      invoiceData as InvoiceData,
      userId
    );
    
    return NextResponse.json({ 
      success: true,
      pdfUrl 
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing with sample data
export async function GET(request: NextRequest) {
  try {
    const sampleData = InvoiceService.getSampleInvoiceData();
    
    // Generate a test PDF
    const pdfUrl = await InvoiceService.generateAndUploadInvoice(
      sampleData,
      'test-user'
    );
    
    return NextResponse.json({ 
      success: true,
      pdfUrl,
      sampleData 
    });
  } catch (error: any) {
    console.error('Error generating test invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate test invoice' },
      { status: 500 }
    );
  }
}