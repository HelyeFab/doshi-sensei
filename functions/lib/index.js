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
exports.stripeWebhook = exports.manageEntitlements = exports.updatePricingConfig = exports.testStorage = exports.reloadEntitlementRules = exports.rebuildConfig = exports.debugYouTubeLimits = exports.adminTestNotification = exports.adminBroadcast = exports.trackNotificationDismiss = exports.trackNotificationClick = exports.testNotification = exports.createReferral = exports.getTextbookVocabulary = exports.syncBugs = exports.getArticleStats = exports.getSubscriptionHealth = exports.getSystemHealthConsistency = exports.updateMaintenanceStatus = exports.getUserEntitlements = exports.fixSubscriptions = exports.fixEntitlements = exports.cleanupSubscriptions = exports.getSubscriptionAnalytics = exports.createCheckoutSession = exports.createPortalSession = exports.updateUserLimit = exports.getSystemHealth = exports.adminDeleteUser = exports.getShareStats = exports.trackShare = exports.updateNotificationPreferences = exports.registerNotificationToken = exports.manageBookmarks = exports.trackArticleView = exports.deleteAccount = exports.cancelSubscription = exports.cleanupNotificationLogs = exports.sendStreakReminders = exports.sendReviewReminders = exports.sendStudyReminders = void 0;
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
Object.defineProperty(exports, "createCheckoutSession", { enumerable: true, get: function () { return admin_operations_1.createCheckoutSession; } });
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
    // IDEMPOTENCY CHECK - Prevent duplicate processing
    const idempotencyKey = event.id;
    const processedEventRef = db.collection('webhook_events').doc(idempotencyKey);
    try {
        // Check if we've already processed this event
        const existingEvent = await processedEventRef.get();
        if (existingEvent.exists) {
            console.log(`Event ${idempotencyKey} already processed - skipping`);
            res.status(200).json({ received: true, duplicate: true });
            return;
        }
    }
    catch (error) {
        console.error('Error checking idempotency:', error);
        // Continue processing if idempotency check fails
    }
    try {
        switch (event.type) {
            case 'customer.subscription.created':
                await handleSubscriptionUpdate(event.data.object, true);
                break;
            case 'customer.subscription.updated':
                // Skip if this is just the initial update after creation
                const subscription = event.data.object;
                const createdAt = subscription.created;
                const now = Math.floor(Date.now() / 1000);
                // If subscription was created less than 10 seconds ago, skip this update
                if (now - createdAt < 10) {
                    console.log('Skipping duplicate subscription update immediately after creation');
                    break;
                }
                await handleSubscriptionUpdate(subscription, false);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                try {
                    await handleInvoicePaymentSucceeded(event.data.object);
                }
                catch (error) {
                    console.error('ERROR in handleInvoicePaymentSucceeded:', error);
                    throw error;
                }
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        // Mark event as successfully processed
        try {
            await processedEventRef.set({
                eventId: event.id,
                type: event.type,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                result: 'success'
            });
        }
        catch (error) {
            console.error('Error marking event as processed:', error);
        }
        // Log successful processing
        await logWebhookEvent(event, 'success');
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        console.error('Event type:', event.type);
        console.error('Event data:', JSON.stringify(event.data.object, null, 2));
        // Log failed processing
        await logWebhookEvent(event, 'error', error instanceof Error ? error.message : 'Unknown error');
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
async function handleSubscriptionUpdate(subscription, isNewSubscription = false) {
    var _a, _b, _c, _d;
    console.log(`Handling subscription ${isNewSubscription ? 'creation' : 'update'}:`, subscription.id);
    if (isNewSubscription) {
        console.log('NEW SUBSCRIPTION - will clear any previous cancellation flags');
    }
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
    console.log('Processing subscription with price ID:', priceId);
    console.log('Subscription status:', status);
    console.log('Is active?:', isActive);
    // Determine the plan based on price ID only (not status)
    // User keeps their plan type even if subscription is past_due or canceled
    let plan = 'free';
    if (priceId) {
        const planMap = {
            // Production price IDs
            'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly', // £8.99/month (LIVE)
            'price_1RubMxHdrJomitOwElEo6nys': 'yearly', // £89.99/year (LIVE)
            // Test price IDs
            'price_1RzIUUQkBRi5wGMEzm9veY3j': 'monthly', // £8.99/month (TEST)
            'price_1RzIVDQkBRi5wGME6v7ECis8': 'yearly' // £89.99/year (TEST)
        };
        plan = planMap[priceId] || 'free';
        if (!planMap[priceId]) {
            console.warn(`Unknown price ID: ${priceId} - defaulting to free plan`);
        }
        // Only set to free if subscription is actually canceled (not just past_due or canceling)
        if (status === 'canceled') {
            plan = 'free';
        }
    }
    try {
        // Get existing subscription data to preserve invoice information
        const userDoc = await db.collection('users').doc(firebaseUID).get();
        const existingSubscription = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.subscription) || {};
        // Build subscription update - preserve ALL existing invoice fields
        const subscriptionUpdate = {
            status: status,
            plan: plan,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            stripePriceId: priceId,
            currentPeriodEnd: currentPeriodEnd,
            // IMPORTANT: For NEW subscriptions, ALWAYS set cancelAtPeriodEnd to false
            // This clears any previous cancellation from old subscriptions
            cancelAtPeriodEnd: isNewSubscription ? false : (subscription.cancel_at_period_end || false),
            metadata: Object.assign({ source: 'stripe', createdAt: ((_c = existingSubscription.metadata) === null || _c === void 0 ? void 0 : _c.createdAt) || admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now() }, (((_d = existingSubscription.metadata) === null || _d === void 0 ? void 0 : _d.lastPaymentUpdate) && {
                lastPaymentUpdate: existingSubscription.metadata.lastPaymentUpdate
            }))
        };
        // IMPORTANT: Preserve ALL existing invoice-related fields
        // These are set by handleInvoicePaymentSucceeded and should never be lost
        const invoiceFieldsToPreserve = [
            'lastInvoiceAmount',
            'lastInvoiceCurrency',
            'lastInvoiceDate',
            'lastInvoiceId',
            'lastInvoicePdf',
            'lastHostedInvoiceUrl',
            'lastPaymentMethod'
        ];
        // Copy over any existing invoice fields
        for (const field of invoiceFieldsToPreserve) {
            if (existingSubscription[field] !== undefined) {
                subscriptionUpdate[field] = existingSubscription[field];
            }
        }
        // Use update with merge to preserve other document fields
        // But completely replace the subscription object with our update
        await db.collection('users').doc(firebaseUID).set({
            subscription: subscriptionUpdate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        // Save to subscription history ONLY if this is a meaningful update
        // Skip history for new subscriptions (they already have payment_succeeded)
        // Skip "free plan" events unless it's a downgrade from a paid plan
        if (!isNewSubscription && (plan !== 'free' || subscription.cancel_at_period_end)) {
            // Check if this is actually a plan change or just a status update
            const previousPlan = existingSubscription.plan;
            const isActualPlanChange = previousPlan && previousPlan !== plan;
            // Only save history for actual changes, not routine updates
            if (isActualPlanChange || subscription.cancel_at_period_end || status === 'past_due') {
                // Determine the event type based on what changed
                let eventType = 'subscription_updated';
                if (subscription.cancel_at_period_end) {
                    eventType = 'subscription_scheduled_cancellation';
                }
                else if (status === 'past_due') {
                    eventType = 'payment_failed';
                }
                await saveSubscriptionHistory(firebaseUID, eventType, {
                    status: status,
                    plan: plan,
                    stripeSubscriptionId: subscription.id,
                    currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toDate().toISOString() : null,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
                    previousPlan: previousPlan || null
                });
            }
        }
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
        // UPDATED: Use set() with merge to handle cases where user document doesn't exist
        await db.collection('users').doc(firebaseUID).set({
            subscription: subscriptionData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
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
    // IMPORTANT: Update the Stripe customer with Firebase UID
    // This ensures future invoices can be linked to the user
    if (session.customer) {
        try {
            const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
            console.log('Updating customer metadata with Firebase UID:', customerId);
            await stripe.customers.update(customerId, {
                metadata: {
                    firebaseUID: firebaseUID
                }
            });
            console.log('Customer metadata updated successfully');
        }
        catch (error) {
            console.error('Error updating customer metadata:', error);
        }
    }
    // For subscription mode, retrieve and process the subscription
    if (session.mode === 'subscription' && session.subscription) {
        try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            console.log('Retrieved subscription from checkout:', subscription.id);
            // DON'T call handleSubscriptionUpdate here - it will be called by the subscription webhook
            // This prevents duplicate history entries
            // await handleSubscriptionUpdate(subscription);
        }
        catch (error) {
            console.error('Error retrieving subscription from checkout:', error);
        }
    }
}
/**
 * Log webhook events for monitoring and debugging
 */
async function logWebhookEvent(event, status, errorMessage) {
    try {
        const logData = {
            eventId: event.id,
            type: event.type,
            status,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            data: {
                // Store minimal relevant data
                objectId: event.data.object.id,
                customerId: event.data.object.customer
            }
        };
        // Only add errorMessage if it's defined to avoid Firestore validation errors
        if (errorMessage !== undefined) {
            logData.errorMessage = errorMessage;
        }
        await db.collection('webhook_logs').add(logData);
    }
    catch (error) {
        console.error('Error logging webhook event:', error);
    }
}
/**
 * Save subscription history event to Firestore with deduplication
 */
async function saveSubscriptionHistory(firebaseUID, eventType, details) {
    var _a;
    try {
        console.log(`Starting saveSubscriptionHistory for user ${firebaseUID}, event: ${eventType}`);
        const historyRef = db.collection('users').doc(firebaseUID).collection('subscription_history');
        // Simplified deduplication for payment_succeeded events - check by invoiceId
        if (eventType === 'payment_succeeded' && details.invoiceId) {
            try {
                console.log(`Checking for duplicate invoice: ${details.invoiceId}`);
                const existingInvoice = await historyRef
                    .where('invoiceId', '==', details.invoiceId)
                    .limit(1)
                    .get();
                if (!existingInvoice.empty) {
                    console.log(`Invoice ${details.invoiceId} already exists in history, skipping`);
                    return;
                }
            }
            catch (queryError) {
                console.log('Invoice deduplication query failed, will add anyway:', queryError);
            }
        }
        // For other event types, check for recent duplicates
        if (eventType !== 'payment_succeeded') {
            try {
                // Simpler query without compound index requirement
                const thirtySecondsAgo = new Date(Date.now() - 30000);
                const recentEvents = await historyRef
                    .where('type', '==', eventType)
                    .limit(10)
                    .get();
                // Check if this is a duplicate event
                for (const doc of recentEvents.docs) {
                    const existingEvent = doc.data();
                    const eventTime = (_a = existingEvent.timestamp) === null || _a === void 0 ? void 0 : _a.toDate();
                    if (eventTime && eventTime > thirtySecondsAgo &&
                        existingEvent.plan === details.plan &&
                        existingEvent.status === details.status) {
                        console.log(`Skipping duplicate ${eventType} event for user ${firebaseUID} (found within 30s window)`);
                        return;
                    }
                }
            }
            catch (queryError) {
                console.log('Deduplication query failed, will add event anyway:', queryError);
            }
        }
        // Add event with unique identifier
        const eventData = Object.assign({ type: eventType, timestamp: admin.firestore.FieldValue.serverTimestamp(), eventId: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, addedAt: admin.firestore.FieldValue.serverTimestamp() }, details);
        console.log('Adding event to subscription_history:', JSON.stringify({
            type: eventData.type,
            plan: eventData.plan,
            amount: eventData.amount,
            invoiceId: eventData.invoiceId
        }));
        await historyRef.add(eventData);
        console.log(`Successfully saved subscription history event for user ${firebaseUID}: ${eventType}`);
    }
    catch (error) {
        console.error('Error saving subscription history:', error);
        console.error('Error stack:', error.stack);
        throw error; // Re-throw to be caught by caller
    }
}
/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice) {
    var _a, _b, _c;
    console.log('Handling invoice payment succeeded:', invoice.id);
    console.log('Invoice customer:', invoice.customer);
    console.log('Invoice subscription:', invoice.subscription);
    // Get Firebase UID from customer metadata OR from subscription metadata
    let firebaseUID;
    if (invoice.customer) {
        try {
            const customer = await stripe.customers.retrieve(invoice.customer);
            if ('deleted' in customer && customer.deleted) {
                console.log('Customer is deleted:', customer.id);
            }
            else {
                const activeCustomer = customer;
                console.log('Customer retrieved:', activeCustomer.id, 'Email:', activeCustomer.email);
            }
            if (customer && !customer.deleted && 'metadata' in customer) {
                firebaseUID = customer.metadata.firebaseUID;
                console.log('Firebase UID from customer metadata:', firebaseUID || 'NOT FOUND');
            }
        }
        catch (error) {
            console.error('Error retrieving customer:', error);
        }
    }
    // If no Firebase UID in customer, try to get it from the subscription
    if (!firebaseUID && invoice.subscription) {
        console.log('Checking subscription for Firebase UID...');
        try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            console.log('Subscription metadata:', subscription.metadata);
            firebaseUID = (_a = subscription.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUID;
            console.log('Firebase UID from subscription:', firebaseUID || 'NOT FOUND');
            // If we found it in subscription, update the customer for future use
            if (firebaseUID && invoice.customer) {
                await stripe.customers.update(invoice.customer, {
                    metadata: { firebaseUID }
                });
                console.log('Updated customer with Firebase UID from subscription');
            }
        }
        catch (error) {
            console.error('Error retrieving subscription for Firebase UID:', error);
        }
    }
    // Last resort: try to find user by email
    if (!firebaseUID && invoice.customer) {
        console.log('Trying to find user by email...');
        try {
            const customer = await stripe.customers.retrieve(invoice.customer);
            if (customer && !customer.deleted && 'email' in customer && customer.email) {
                console.log('Searching for user with email:', customer.email);
                const usersSnapshot = await db.collection('users')
                    .where('email', '==', customer.email)
                    .limit(1)
                    .get();
                if (!usersSnapshot.empty) {
                    firebaseUID = usersSnapshot.docs[0].id;
                    console.log(`Found Firebase UID by email: ${customer.email} -> ${firebaseUID}`);
                    // Update customer metadata for future
                    await stripe.customers.update(invoice.customer, {
                        metadata: { firebaseUID }
                    });
                    console.log('Updated customer metadata with found Firebase UID');
                }
                else {
                    console.log('No user found with email:', customer.email);
                }
            }
        }
        catch (error) {
            console.error('Error finding user by email:', error);
        }
    }
    if (!firebaseUID) {
        console.error('CRITICAL: No firebaseUID found for invoice customer after all attempts');
        console.error('Invoice will not be saved to user history!');
        return;
    }
    console.log('SUCCESS: Found Firebase UID:', firebaseUID);
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
    // Determine plan - try subscription first, then fall back to line items
    let plan = 'unknown';
    // First try to get plan from the subscription itself (most reliable)
    if (invoice.subscription) {
        try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const subPriceId = (_b = subscription.items.data[0]) === null || _b === void 0 ? void 0 : _b.price.id;
            if (subPriceId) {
                const planMap = {
                    // Production price IDs
                    'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',
                    'price_1RubMxHdrJomitOwElEo6nys': 'yearly',
                    // Test price IDs
                    'price_1RzIUUQkBRi5wGMEzm9veY3j': 'monthly', // TEST monthly
                    'price_1RzIVDQkBRi5wGME6v7ECis8': 'yearly' // TEST yearly
                };
                plan = planMap[subPriceId] || 'unknown';
                console.log(`Plan detected from subscription: ${plan} (price: ${subPriceId})`);
            }
        }
        catch (error) {
            console.error('Error retrieving subscription for plan detection:', error);
        }
    }
    // Fall back to invoice line items if subscription lookup failed
    if (plan === 'unknown' && invoice.lines && invoice.lines.data.length > 0) {
        const priceId = (_c = invoice.lines.data[0].price) === null || _c === void 0 ? void 0 : _c.id;
        if (priceId) {
            const planMap = {
                // Production price IDs
                'price_1RubMXHdrJomitOwNNI4LmWB': 'monthly',
                'price_1RubMxHdrJomitOwElEo6nys': 'yearly',
                // Test price IDs
                'price_1RzIUUQkBRi5wGMEzm9veY3j': 'monthly', // TEST monthly
                'price_1RzIVDQkBRi5wGME6v7ECis8': 'yearly' // TEST yearly
            };
            plan = planMap[priceId] || 'unknown';
            console.log(`Plan detected from invoice lines: ${plan} (price: ${priceId})`);
        }
    }
    // Save to subscription history
    console.log('Saving invoice to subscription history for user:', firebaseUID);
    console.log('Invoice data:', {
        id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        pdf: invoice.invoice_pdf ? 'Available' : 'Not available',
        hostedUrl: invoice.hosted_invoice_url ? 'Available' : 'Not available'
    });
    try {
        // Build details object, excluding undefined values
        const invoiceDetails = {
            amountDue: invoice.amount_due,
            amountPaid: invoice.amount_paid,
            amountRemaining: invoice.amount_remaining
        };
        // Only add optional fields if they have values
        if (invoice.tax !== null && invoice.tax !== undefined) {
            invoiceDetails.tax = invoice.tax;
        }
        if (invoice.subtotal !== null && invoice.subtotal !== undefined) {
            invoiceDetails.subtotal = invoice.subtotal;
        }
        if (invoice.total !== null && invoice.total !== undefined) {
            invoiceDetails.total = invoice.total;
        }
        if (invoice.period_start) {
            invoiceDetails.periodStart = new Date(invoice.period_start * 1000).toISOString();
        }
        if (invoice.period_end) {
            invoiceDetails.periodEnd = new Date(invoice.period_end * 1000).toISOString();
        }
        const historyData = {
            status: 'paid',
            plan: plan,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            invoiceId: invoice.id,
            details: invoiceDetails
        };
        // Add optional fields only if they exist
        if (invoice.number) {
            historyData.invoiceNumber = invoice.number;
        }
        if (invoice.invoice_pdf) {
            historyData.invoicePdf = invoice.invoice_pdf;
        }
        if (invoice.hosted_invoice_url) {
            historyData.hostedInvoiceUrl = invoice.hosted_invoice_url;
        }
        if (paymentMethodDetails) {
            historyData.paymentMethod = paymentMethodDetails;
        }
        await saveSubscriptionHistory(firebaseUID, 'payment_succeeded', historyData);
        console.log('Successfully saved invoice to subscription history');
    }
    catch (error) {
        console.error('ERROR saving invoice to subscription history:', error);
        console.error('Error details:', JSON.stringify(error));
        // Don't throw - continue with subscription update
    }
    // CRITICAL: Also update the main subscription record with invoice data
    // This ensures the subscription has the latest payment information
    try {
        await db.collection('users').doc(firebaseUID).update({
            'subscription.lastInvoiceAmount': invoice.amount_paid,
            'subscription.lastInvoiceCurrency': invoice.currency,
            'subscription.lastInvoiceDate': admin.firestore.Timestamp.now(),
            'subscription.lastInvoiceId': invoice.id,
            'subscription.lastInvoicePdf': invoice.invoice_pdf,
            'subscription.lastHostedInvoiceUrl': invoice.hosted_invoice_url,
            'subscription.lastPaymentMethod': paymentMethodDetails,
            'subscription.metadata.lastPaymentUpdate': admin.firestore.Timestamp.now()
        });
        console.log(`Updated main subscription with invoice data for user ${firebaseUID}`);
    }
    catch (error) {
        console.error('Error updating subscription with invoice data:', error);
    }
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