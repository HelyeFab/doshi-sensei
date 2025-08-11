/**
 * Stripe Payment Links Configuration
 * 
 * Payment Links automatically support:
 * - Credit/Debit Cards
 * - Google Pay (on Android/Chrome)
 * - Apple Pay (on Safari/iOS)
 * - Link (Stripe's fast checkout)
 * 
 * No additional code needed - Stripe handles everything!
 */

interface PaymentLinkConfig {
  monthly: string;
  yearly: string;
  successUrl: string;
  cancelUrl: string;
}

export const STRIPE_PAYMENT_LINKS: PaymentLinkConfig = {
  // These will be your actual Payment Link URLs from Stripe Dashboard
  monthly: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || '',
  yearly: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY || '',
  
  // Where to redirect after payment
  successUrl: process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/account?payment=success`
    : 'https://doshisensei.com/account?payment=success',
  
  cancelUrl: process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/account?payment=cancelled`
    : 'https://doshisensei.com/account?payment=cancelled',
};

/**
 * Get the payment link URL with optional parameters
 */
export function getPaymentLink(
  plan: 'monthly' | 'yearly',
  userId?: string,
  userEmail?: string
): string {
  const baseUrl = plan === 'monthly' 
    ? STRIPE_PAYMENT_LINKS.monthly 
    : STRIPE_PAYMENT_LINKS.yearly;
  
  if (!baseUrl) {
    console.error(`Payment link not configured for ${plan} plan`);
    return '';
  }
  
  // Stripe Payment Links support prefilling customer email
  const params = new URLSearchParams();
  
  if (userEmail) {
    params.append('prefilled_email', userEmail);
  }
  
  // Add client reference ID (will be included in webhook)
  if (userId) {
    params.append('client_reference_id', userId);
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Check if we're using Payment Links (vs traditional Checkout)
 */
export function isUsingPaymentLinks(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY ||
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY
  );
}