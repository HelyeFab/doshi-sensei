#!/usr/bin/env node

/**
 * Script to create Stripe products and prices for Doshi Sensei subscription plans
 * Run this script to set up your subscription products in Stripe
 *
 * Usage: node scripts/setup-stripe-products.js
 */

const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  try {
    console.log('🚀 Creating Stripe products and prices...\n');

    // Create Monthly subscription product
    console.log('📦 Creating Monthly subscription product...');
    const monthlyProduct = await stripe.products.create({
      name: 'Doshi Sensei Monthly',
      description: 'Monthly subscription to Doshi Sensei - Unlimited Japanese conjugation practice with cloud sync',
      metadata: {
        plan: 'monthly',
        app: 'doshi-sensei'
      }
    });

    const monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 399, // $3.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'monthly',
        app: 'doshi-sensei'
      }
    });

    console.log(`✅ Monthly product created: ${monthlyProduct.id}`);
    console.log(`✅ Monthly price created: ${monthlyPrice.id}\n`);

    // Create Yearly subscription product
    console.log('📦 Creating Yearly subscription product...');
    const yearlyProduct = await stripe.products.create({
      name: 'Doshi Sensei Yearly',
      description: 'Yearly subscription to Doshi Sensei - Unlimited Japanese conjugation practice with cloud sync (2 months free!)',
      metadata: {
        plan: 'yearly',
        app: 'doshi-sensei'
      }
    });

    const yearlyPrice = await stripe.prices.create({
      product: yearlyProduct.id,
      unit_amount: 3999, // $39.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      metadata: {
        plan: 'yearly',
        app: 'doshi-sensei'
      }
    });

    console.log(`✅ Yearly product created: ${yearlyProduct.id}`);
    console.log(`✅ Yearly price created: ${yearlyPrice.id}\n`);

    // Display results
    console.log('🎉 Products and prices created successfully!\n');
    console.log('📝 Add these to your .env file:\n');
    console.log(`NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=${yearlyPrice.id}\n`);

    console.log('📋 Summary:');
    console.log(`Monthly Plan: $3.99/month (Price ID: ${monthlyPrice.id})`);
    console.log(`Yearly Plan: $39.99/year (Price ID: ${yearlyPrice.id})`);
    console.log('\n🔗 View your products in Stripe Dashboard: https://dashboard.stripe.com/products');

  } catch (error) {
    console.error('❌ Error creating products:', error.message);

    if (error.type === 'StripeAuthenticationError') {
      console.error('\n🔑 Please check your STRIPE_SECRET_KEY in the .env file');
    }

    process.exit(1);
  }
}

// Run the script
createProducts();
