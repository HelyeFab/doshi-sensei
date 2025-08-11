import { pdf } from '@react-pdf/renderer';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import InvoiceTemplate, { InvoiceData } from '@/components/invoice/InvoiceTemplate';
import React from 'react';
import Stripe from 'stripe';

export class InvoiceService {
  /**
   * Generates a PDF invoice and uploads it to Firebase Storage
   * @param invoiceData The invoice data to generate PDF from
   * @param userId The user ID for organizing storage
   * @returns The download URL of the uploaded PDF
   */
  static async generateAndUploadInvoice(
    invoiceData: InvoiceData,
    userId: string
  ): Promise<string> {
    try {
      // Create the PDF document
      const document = React.createElement(InvoiceTemplate, {
        data: invoiceData,
        logoUrl: '/doshi.png'
      });

      // Generate the PDF blob
      const blob = await pdf(document).toBlob();

      // Create a storage reference
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `invoices/${userId}/${invoiceData.invoiceNumber}_${timestamp}.pdf`;
      const storageRef = ref(storage, filename);

      // Upload the PDF to Firebase Storage
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: 'application/pdf',
        customMetadata: {
          userId,
          invoiceNumber: invoiceData.invoiceNumber,
          invoiceDate: invoiceData.invoiceDate,
          total: invoiceData.total.toString(),
          currency: invoiceData.currency,
          paymentStatus: invoiceData.paymentStatus,
        }
      });

      // Get the download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      console.log(`Invoice PDF uploaded successfully: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      console.error('Error generating/uploading invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Converts Stripe invoice data to our InvoiceData format
   * @param stripeInvoice The Stripe invoice object
   * @param customer Optional customer details
   * @returns Formatted invoice data for PDF generation
   */
  static formatStripeInvoice(
    stripeInvoice: Stripe.Invoice,
    customer?: Stripe.Customer | Stripe.DeletedCustomer | string
  ): InvoiceData {
    // Extract customer details
    let customerName = 'Customer';
    let customerEmail = stripeInvoice.customer_email || 'customer@example.com';
    let customerAddress = '';

    if (customer && typeof customer === 'object' && 'email' in customer) {
      customerName = customer.name || customerName;
      customerEmail = customer.email || customerEmail;
      
      if (customer.address) {
        const addr = customer.address;
        customerAddress = [
          addr.line1,
          addr.line2,
          addr.city,
          addr.state,
          addr.postal_code,
          addr.country
        ].filter(Boolean).join(', ');
      }
    }

    // Format line items
    const items = stripeInvoice.lines?.data.map(lineItem => ({
      description: lineItem.description || 'Subscription',
      quantity: lineItem.quantity || 1,
      price: (lineItem.price?.unit_amount || 0) / 100,
      amount: lineItem.amount / 100,
    })) || [];

    // Determine payment status
    let paymentStatus: 'paid' | 'pending' | 'failed' = 'pending';
    if (stripeInvoice.status === 'paid' || stripeInvoice.paid) {
      paymentStatus = 'paid';
    } else if (stripeInvoice.status === 'uncollectible' || stripeInvoice.status === 'void') {
      paymentStatus = 'failed';
    }

    // Extract payment method if available
    let paymentMethod = '';
    if (stripeInvoice.payment_intent && typeof stripeInvoice.payment_intent === 'object') {
      const paymentIntent = stripeInvoice.payment_intent as Stripe.PaymentIntent;
      if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
        const pm = paymentIntent.payment_method as Stripe.PaymentMethod;
        if (pm.type === 'card' && pm.card) {
          paymentMethod = `${pm.card.brand?.toUpperCase()} •••• ${pm.card.last4}`;
        } else {
          paymentMethod = pm.type;
        }
      }
    }

    return {
      invoiceNumber: stripeInvoice.number || stripeInvoice.id,
      invoiceDate: new Date(stripeInvoice.created * 1000).toISOString(),
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000).toISOString() : undefined,
      customerName,
      customerEmail,
      customerAddress: customerAddress || undefined,
      items,
      subtotal: (stripeInvoice.subtotal || 0) / 100,
      tax: stripeInvoice.tax ? stripeInvoice.tax / 100 : undefined,
      discount: stripeInvoice.discount ? stripeInvoice.discount.coupon.amount_off ? 
        stripeInvoice.discount.coupon.amount_off / 100 : 
        ((stripeInvoice.subtotal || 0) * (stripeInvoice.discount.coupon.percent_off || 0) / 100) / 100 : 
        undefined,
      total: (stripeInvoice.total || 0) / 100,
      currency: stripeInvoice.currency || 'usd',
      paymentStatus,
      paymentMethod: paymentMethod || undefined,
      notes: `Thank you for subscribing to Doshi Sensei! Your subscription helps us continue improving and adding new features to help you master Japanese.`,
    };
  }

  /**
   * Generates a sample invoice for testing
   * @returns Sample invoice data
   */
  static getSampleInvoiceData(): InvoiceData {
    return {
      invoiceNumber: 'INV-2025-001',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      customerAddress: '123 Learning Street, Tokyo, Japan 100-0001',
      items: [
        {
          description: 'Doshi Sensei Premium - Monthly Subscription',
          quantity: 1,
          price: 9.99,
          amount: 9.99,
        },
      ],
      subtotal: 9.99,
      tax: 0.90,
      total: 10.89,
      currency: 'usd',
      paymentStatus: 'paid',
      paymentMethod: 'VISA •••• 4242',
      notes: 'Thank you for subscribing to Doshi Sensei Premium! Enjoy unlimited access to all features.',
    };
  }
}