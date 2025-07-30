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
exports.stripeWebhook = void 0;
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Initialize Stripe (will be initialized in the function)
let stripe;
// Webhook endpoint (v2 function - requires explicit public access)
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
            timestamp: new Date().toISOString()
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
async function handleSubscriptionUpdate(subscription) {
    var _a;
    console.log('Handling subscription update:', subscription.id);
    const firebaseUID = subscription.metadata.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in subscription metadata');
        return;
    }
    const status = subscription.status;
    // Handle cases where current_period_end might be null/undefined
    const currentPeriodEnd = subscription.current_period_end
        ? admin.firestore.Timestamp.fromDate(new Date(subscription.current_period_end * 1000))
        : null;
    const isActive = ['active', 'trialing'].includes(status);
    // Get the price ID from the subscription
    const priceId = ((_a = subscription.items.data[0]) === null || _a === void 0 ? void 0 : _a.price.id) || null;
    // Determine the plan based on status and price ID
    let plan = 'free';
    if (isActive && priceId) {
        // Map price IDs to plan names that match the app's expectations
        const planMap = {
            'price_1RakzXHdrJomitOwZc0HJC4J': 'monthly',
            'price_1RakzXHdrJomitOwE7B56erf': 'yearly'
        };
        plan = planMap[priceId] || 'free';
    }
    try {
        const updateData = {
            'subscription.status': status,
            'subscription.plan': plan, // THIS IS THE CRITICAL FIX
            'subscription.stripeSubscriptionId': subscription.id,
            'subscription.stripePriceId': priceId,
            'subscription.stripeCustomerId': subscription.customer,
            'entitlements.isPremium': isActive,
            'entitlements.premiumType': isActive ? 'stripe' : null,
            'entitlements.premiumSince': isActive ? admin.firestore.FieldValue.serverTimestamp() : null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Only add currentPeriodEnd if it exists
        if (currentPeriodEnd) {
            updateData['subscription.currentPeriodEnd'] = currentPeriodEnd;
        }
        await db.collection('users').doc(firebaseUID).update(updateData);
        console.log(`Updated subscription for user ${firebaseUID}: ${status}, plan: ${plan}`);
    }
    catch (error) {
        console.error('Error updating user subscription:', error);
        throw error;
    }
}
async function handleSubscriptionDeleted(subscription) {
    console.log('Handling subscription deletion:', subscription.id);
    const firebaseUID = subscription.metadata.firebaseUID;
    if (!firebaseUID) {
        console.error('No firebaseUID in subscription metadata');
        return;
    }
    try {
        await db.collection('users').doc(firebaseUID).update({
            'subscription.status': 'canceled',
            'subscription.plan': 'free', // Reset plan to free when canceled
            'subscription.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
            'entitlements.isPremium': false,
            'entitlements.premiumType': null,
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