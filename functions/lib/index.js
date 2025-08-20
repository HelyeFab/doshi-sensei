"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.manageEntitlements = exports.updatePricingConfig = exports.testStorage = exports.reloadEntitlementRules = exports.rebuildConfig = exports.debugYouTubeLimits = exports.adminTestNotification = exports.adminBroadcast = exports.trackNotificationDismiss = exports.trackNotificationClick = exports.testNotification = exports.createReferral = exports.getTextbookVocabulary = exports.syncBugs = exports.getArticleStats = exports.getSubscriptionHealth = exports.getSystemHealthConsistency = exports.updateMaintenanceStatus = exports.getUserEntitlements = exports.fixSubscriptions = exports.fixEntitlements = exports.cleanupSubscriptions = exports.getSubscriptionAnalytics = exports.createPortalSession = exports.updateUserLimit = exports.getSystemHealth = exports.adminDeleteUser = exports.getShareStats = exports.trackShare = exports.updateNotificationPreferences = exports.registerNotificationToken = exports.manageBookmarks = exports.trackArticleView = exports.deleteAccount = exports.cancelSubscription = exports.cleanupNotificationLogs = exports.sendStreakReminders = exports.sendReviewReminders = exports.sendStudyReminders = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Export notification functions
var notifications_1 = require("./notifications");
Object.defineProperty(exports, "sendStudyReminders", { enumerable: true, get: function () { return notifications_1.sendStudyReminders; } });
Object.defineProperty(exports, "sendReviewReminders", { enumerable: true, get: function () { return notifications_1.sendReviewReminders; } });
Object.defineProperty(exports, "sendStreakReminders", { enumerable: true, get: function () { return notifications_1.sendStreakReminders; } });
Object.defineProperty(exports, "cleanupNotificationLogs", { enumerable: true, get: function () { return notifications_1.cleanupNotificationLogs; } });
// Export admin operations (replacing Netlify functions)
var admin_operations_1 = require("./admin-operations");
Object.defineProperty(exports, "cancelSubscription", { enumerable: true, get: function () { return admin_operations_1.cancelSubscription; } });
Object.defineProperty(exports, "deleteAccount", { enumerable: true, get: function () { return admin_operations_1.deleteAccount; } });
Object.defineProperty(exports, "trackArticleView", { enumerable: true, get: function () { return admin_operations_1.trackArticleView; } });
Object.defineProperty(exports, "manageBookmarks", { enumerable: true, get: function () { return admin_operations_1.manageBookmarks; } });
Object.defineProperty(exports, "registerNotificationToken", { enumerable: true, get: function () { return admin_operations_1.registerNotificationToken; } });
Object.defineProperty(exports, "updateNotificationPreferences", { enumerable: true, get: function () { return admin_operations_1.updateNotificationPreferences; } });
Object.defineProperty(exports, "trackShare", { enumerable: true, get: function () { return admin_operations_1.trackShare; } });
Object.defineProperty(exports, "getShareStats", { enumerable: true, get: function () { return admin_operations_1.getShareStats; } });
Object.defineProperty(exports, "adminDeleteUser", { enumerable: true, get: function () { return admin_operations_1.adminDeleteUser; } });
Object.defineProperty(exports, "getSystemHealth", { enumerable: true, get: function () { return admin_operations_1.getSystemHealth; } });
Object.defineProperty(exports, "updateUserLimit", { enumerable: true, get: function () { return admin_operations_1.updateUserLimit; } });
Object.defineProperty(exports, "createPortalSession", { enumerable: true, get: function () { return admin_operations_1.createPortalSession; } });
// Export admin analytics functions
var admin_analytics_1 = require("./admin-analytics");
Object.defineProperty(exports, "getSubscriptionAnalytics", { enumerable: true, get: function () { return admin_analytics_1.getSubscriptionAnalytics; } });
Object.defineProperty(exports, "cleanupSubscriptions", { enumerable: true, get: function () { return admin_analytics_1.cleanupSubscriptions; } });
Object.defineProperty(exports, "fixEntitlements", { enumerable: true, get: function () { return admin_analytics_1.fixEntitlements; } });
Object.defineProperty(exports, "fixSubscriptions", { enumerable: true, get: function () { return admin_analytics_1.fixSubscriptions; } });
Object.defineProperty(exports, "getUserEntitlements", { enumerable: true, get: function () { return admin_analytics_1.getUserEntitlements; } });
Object.defineProperty(exports, "updateMaintenanceStatus", { enumerable: true, get: function () { return admin_analytics_1.updateMaintenanceStatus; } });
Object.defineProperty(exports, "getSystemHealthConsistency", { enumerable: true, get: function () { return admin_analytics_1.getSystemHealthConsistency; } });
Object.defineProperty(exports, "getSubscriptionHealth", { enumerable: true, get: function () { return admin_analytics_1.getSubscriptionHealth; } });
Object.defineProperty(exports, "getArticleStats", { enumerable: true, get: function () { return admin_analytics_1.getArticleStats; } });
// Export extended operations
var extended_operations_1 = require("./extended-operations");
Object.defineProperty(exports, "syncBugs", { enumerable: true, get: function () { return extended_operations_1.syncBugs; } });
Object.defineProperty(exports, "getTextbookVocabulary", { enumerable: true, get: function () { return extended_operations_1.getTextbookVocabulary; } });
Object.defineProperty(exports, "createReferral", { enumerable: true, get: function () { return extended_operations_1.createReferral; } });
Object.defineProperty(exports, "testNotification", { enumerable: true, get: function () { return extended_operations_1.testNotification; } });
Object.defineProperty(exports, "trackNotificationClick", { enumerable: true, get: function () { return extended_operations_1.trackNotificationClick; } });
Object.defineProperty(exports, "trackNotificationDismiss", { enumerable: true, get: function () { return extended_operations_1.trackNotificationDismiss; } });
Object.defineProperty(exports, "adminBroadcast", { enumerable: true, get: function () { return extended_operations_1.adminBroadcast; } });
Object.defineProperty(exports, "adminTestNotification", { enumerable: true, get: function () { return extended_operations_1.adminTestNotification; } });
Object.defineProperty(exports, "debugYouTubeLimits", { enumerable: true, get: function () { return extended_operations_1.debugYouTubeLimits; } });
Object.defineProperty(exports, "rebuildConfig", { enumerable: true, get: function () { return extended_operations_1.rebuildConfig; } });
Object.defineProperty(exports, "reloadEntitlementRules", { enumerable: true, get: function () { return extended_operations_1.reloadEntitlementRules; } });
Object.defineProperty(exports, "testStorage", { enumerable: true, get: function () { return extended_operations_1.testStorage; } });
Object.defineProperty(exports, "updatePricingConfig", { enumerable: true, get: function () { return extended_operations_1.updatePricingConfig; } });
Object.defineProperty(exports, "manageEntitlements", { enumerable: true, get: function () { return extended_operations_1.manageEntitlements; } });
// Initialize Stripe (will be initialized in the function)
let stripe;
/**
 * Clean Stripe Webhook using Three-Pillar Architecture
 *
 * This webhook ONLY manages the subscription data structure.
 * The Three-Pillar system handles all entitlements, features, and access control.
 *
 * UPDATED: Now replaces entire subscription object to prevent mixing old/new structures
 */
exports.stripeWebhook = v2_1.https.onRequest({ cors: true }, async (req, res) => {
    console.log('Firebase Function: stripeWebhook called');
    console.log('Method:', req.method);
    // Initialize Stripe on first request
    if (!stripe) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            console.error('STRIPE_SECRET_KEY not found in environment');
            res.status(500).json({ error: 'Stripe configuration error' });
            return;
        }
        stripe = new stripe_1.default(secretKey, {
            apiVersion: '2023-10-16',
        });
    }
    // Handle GET requests for testing
    if (req.method === 'GET') {
        res.status(200).json({
            status: 'Stripe webhook endpoint is active',
            timestamp: new Date().toISOString(),
            architecture: 'Three-Pillar System'
        });
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        res.status(500).json({ error: 'Webhook secret not configured' });
        return;
    }
    let event;
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.rawBody.toString(), signature, webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
    }
    console.log('Processing webhook event:', event.type);
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
/**
 * Handle subscription updates - CLEAN STRUCTURE ONLY
 *
 * The subscription object in Firebase should contain ONLY:
 * - status: 'active' | 'inactive' | 'canceled' | 'past_due'
 * - plan: 'free' | 'monthly' | 'yearly'
 * - stripeSubscriptionId: string
 * - stripeCustomerId: string
 * - stripePriceId: string
 * - currentPeriodEnd: Timestamp
 * - cancelAtPeriodEnd: boolean
 * - metadata: { source, createdAt, updatedAt }
 *
 * UPDATED: Now uses update() to completely replace subscription object
 */
async function handleSubscriptionUpdate(subscription) {
    var _a;
    console.log('Handling subscription update:', subscription.id);
    // Check both subscription and customer metadata for firebaseUID
    let firebaseUID = subscription.metadata.firebaseUID;
    if (!firebaseUID && subscription.customer) {
        try {
            const customer = await stripe.customers.retrieve(subscription.customer);
            if (customer && !customer.deleted && 'metadata' in customer) {
                firebaseUID = customer.metadata.firebaseUID;
            }
        }
        catch (error) {
            console.error('Error retrieving customer:', error);
        }
    }
    if (!firebaseUID) {
        console.error('No firebaseUID found in subscription or customer metadata');
        return;
    }
    const status = subscription.status;
    const currentPeriodEnd = subscription.current_period_end
        ? admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000))
        : null;
    const isActive = ['active', 'trialing'].includes(status);
    // Get the price ID from the subscription
    const priceId = ((_a = subscription.items.data[0]) === null || _a === void 0 ? void 0 : _a.price.id) || null;
    // Determine the plan based on status and price ID
    let plan = 'free';
    if (isActive && priceId) {
        const planMap = {
            'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly', // £8.99/month (LIVE)
            'price_1RubMxHdrJomitOwElEo6nys': 'yearly' // £89.99/year (LIVE)
        };
        plan = planMap[priceId] || 'free';
    }
    try {
        // CLEAN subscription structure - no nested objects!
        const subscriptionData = {
            status: status,
            plan: plan,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            stripePriceId: priceId,
            currentPeriodEnd: currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
            metadata: {
                source: 'stripe',
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            }
        };
        // UPDATED: Use update() to completely replace subscription object
        // This prevents mixing old nested structures with new flat structure
        await db.collection('users').doc(firebaseUID).update({
            subscription: subscriptionData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Save to subscription history
        await saveSubscriptionHistory(firebaseUID, 'subscription_updated', {
            status: status,
            plan: plan,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toDate().toISOString() : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false
        });
        console.log(`Updated subscription for user ${firebaseUID}:`, {
            status,
            plan,
            subscriptionId: subscription.id
        });
    }
    catch (error) {
        console.error('Error updating user subscription:', error);
        throw error;
    }
}
async function handleSubscriptionDeleted(subscription) {
    console.log('Handling subscription deletion:', subscription.id);
    // Check both subscription and customer metadata for firebaseUID
    let firebaseUID = subscription.metadata.firebaseUID;
    if (!firebaseUID && subscription.customer) {
        try {
            const customer = await stripe.customers.retrieve(subscription.customer);
            if (customer && !customer.deleted && 'metadata' in customer) {
                firebaseUID = customer.metadata.firebaseUID;
            }
        }
        catch (error) {
            console.error('Error retrieving customer:', error);
        }
    }
    if (!firebaseUID) {
        console.error('No firebaseUID found in subscription or customer metadata');
        return;
    }
    try {
        // Set to free plan with canceled status
        const subscriptionData = {
            status: 'canceled',
            plan: 'free',
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            stripePriceId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            canceledAt: admin.firestore.Timestamp.now(),
            metadata: {
                source: 'stripe',
                updatedAt: admin.firestore.Timestamp.now()
            }
        };
        // UPDATED: Use update() to completely replace subscription object
        await db.collection('users').doc(firebaseUID).update({
            subscription: subscriptionData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Save to subscription history
        await saveSubscriptionHistory(firebaseUID, 'subscription_canceled', {
            status: 'canceled',
            plan: 'free',
            stripeSubscriptionId: subscription.id
        });
        console.log(`Canceled subscription for user ${firebaseUID}`);
    }
    catch (error) {
        console.error('Error canceling user subscription:', error);
        throw error;
    }
}
async function handleCheckoutCompleted(session) {
    var _a;
    console.log('Handling checkout completion:', session.id);
    const firebaseUID = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in session metadata');
        return;
    }
    console.log('Checkout completed for user:', firebaseUID);
    // For subscription mode, retrieve and process the subscription
    if (session.mode === 'subscription' && session.subscription) {
        try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            console.log('Retrieved subscription from checkout:', subscription.id);
            await handleSubscriptionUpdate(subscription);
        }
        catch (error) {
            console.error('Error retrieving subscription from checkout:', error);
        }
    }
}
/**
 * Save subscription history event to Firestore
 */
async function saveSubscriptionHistory(firebaseUID, eventType, details) {
    try {
        const historyRef = db.collection('users').doc(firebaseUID).collection('subscription_history');
        await historyRef.add(Object.assign({ type: eventType, timestamp: admin.firestore.FieldValue.serverTimestamp() }, details));
        console.log(`Saved subscription history event for user ${firebaseUID}: ${eventType}`);
    }
    catch (error) {
        console.error('Error saving subscription history:', error);
    }
}
/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice) {
    var _a;
    console.log('Handling invoice payment succeeded:', invoice.id);
    // Get Firebase UID from customer metadata
    let firebaseUID;
    if (invoice.customer) {
        try {
            const customer = await stripe.customers.retrieve(invoice.customer);
            if (customer && !customer.deleted && 'metadata' in customer) {
                firebaseUID = customer.metadata.firebaseUID;
            }
        }
        catch (error) {
            console.error('Error retrieving customer:', error);
        }
    }
    if (!firebaseUID) {
        console.error('No firebaseUID found for invoice customer');
        return;
    }
    // Get payment method details
    let paymentMethodDetails = null;
    if (invoice.payment_intent) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
            if (paymentIntent.payment_method) {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                if (paymentMethod.card) {
                    paymentMethodDetails = {
                        type: 'card',
                        brand: paymentMethod.card.brand,
                        last4: paymentMethod.card.last4,
                        expMonth: paymentMethod.card.exp_month,
                        expYear: paymentMethod.card.exp_year
                    };
                }
            }
        }
        catch (error) {
            console.error('Error retrieving payment method:', error);
        }
    }
    // Determine plan from line items
    let plan = 'unknown';
    if (invoice.lines && invoice.lines.data.length > 0) {
        const priceId = (_a = invoice.lines.data[0].price) === null || _a === void 0 ? void 0 : _a.id;
        if (priceId) {
            const planMap = {
                'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',
                'price_1RubMxHdrJomitOwElEo6nys': 'yearly'
            };
            plan = planMap[priceId] || 'unknown';
        }
    }
    // Save to subscription history
    await saveSubscriptionHistory(firebaseUID, 'payment_succeeded', {
        status: 'paid',
        plan: plan,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        invoicePdf: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        paymentMethod: paymentMethodDetails,
        details: {
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            amountRemaining: invoice.amount_remaining,
            tax: invoice.tax,
            subtotal: invoice.subtotal,
            total: invoice.total,
            periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
        }
    });
}
/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice) {
    console.log('Handling invoice payment failed:', invoice.id);
    // Get Firebase UID from customer metadata
    let firebaseUID;
    if (invoice.customer) {
        try {
            const customer = await stripe.customers.retrieve(invoice.customer);
            if (customer && !customer.deleted && 'metadata' in customer) {
                firebaseUID = customer.metadata.firebaseUID;
            }
        }
        catch (error) {
            console.error('Error retrieving customer:', error);
        }
    }
    if (!firebaseUID) {
        console.error('No firebaseUID found for invoice customer');
        return;
    }
    // Save to subscription history
    await saveSubscriptionHistory(firebaseUID, 'payment_failed', {
        status: 'failed',
        plan: 'unknown',
        amount: invoice.amount_due,
        currency: invoice.currency,
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
        details: {
            amountDue: invoice.amount_due,
            lastPaymentError: invoice.last_finalization_error
        }
    });
}
//# sourceMappingURL=index.js.map