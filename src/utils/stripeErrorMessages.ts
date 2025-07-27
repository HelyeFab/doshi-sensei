/**
 * User-friendly error messages for common Stripe errors
 */

export const stripeErrorMessages: Record<string, string> = {
  // Card errors
  'card_declined': 'Your card was declined. Please try a different payment method.',
  'insufficient_funds': 'Your card has insufficient funds. Please try a different card.',
  'lost_card': 'This card has been reported lost. Please use a different card.',
  'stolen_card': 'This card has been reported stolen. Please use a different card.',
  'expired_card': 'Your card has expired. Please use a card with a valid expiration date.',
  'incorrect_cvc': 'The CVC number is incorrect. Please check and try again.',
  'processing_error': 'An error occurred while processing your card. Please try again.',
  'incorrect_number': 'The card number is incorrect. Please check and try again.',
  
  // Payment errors
  'payment_method_not_available': 'This payment method is not available. Please try a different one.',
  'currency_not_supported': 'This currency is not supported. Please contact support.',
  
  // Account errors
  'account_country_invalid_address': 'The billing address country is invalid. Please check your address.',
  'account_error_country_change_requires_additional_steps': 'Additional verification required. Please contact support.',
  
  // Rate limiting
  'rate_limit': 'Too many attempts. Please wait a few minutes and try again.',
  
  // General errors
  'api_key_expired': 'Configuration error. Please contact support.',
  'authentication_required': 'Additional authentication required. You will be redirected.',
  'payment_intent_authentication_failure': 'Authentication failed. Please try again.',
  
  // Default message
  'default': 'An error occurred processing your payment. Please try again or contact support.'
};

export function getStripeErrorMessage(stripeError: any): string {
  // Check for decline_code first
  if (stripeError.decline_code) {
    return stripeErrorMessages[stripeError.decline_code] || stripeErrorMessages['card_declined'];
  }
  
  // Check for error code
  if (stripeError.code) {
    return stripeErrorMessages[stripeError.code] || stripeError.message || stripeErrorMessages['default'];
  }
  
  // Return original message or default
  return stripeError.message || stripeErrorMessages['default'];
}