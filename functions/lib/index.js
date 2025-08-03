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
exports.stripeWebhook = exports.cleanupNotificationLogs = exports.sendStreakReminders = exports.sendReviewReminders = exports.sendStudyReminders = void 0;
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
            'price_1RakzXHdrJomitOwZc0HJC4J': 'monthly',
            'price_1RakzXHdrJomitOwE7B56erf': 'yearly'
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
//# sourceMappingURL=index.js.map