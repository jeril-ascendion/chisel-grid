import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

// Stripe v22 — import types from specific modules
type StripeCheckoutSession = {
  metadata: Record<string, string> | null;
  subscription: string | { id: string } | null;
  customer: string | { id: string } | null;
  customer_email: string | null;
};

type StripeSubscription = {
  metadata: Record<string, string>;
  status: string;
  current_period_end: number;
  items: { data: Array<{ price: { id: string } }> };
};

type StripeInvoice = {
  amount_paid: number;
  subscription: string | { metadata: Record<string, string> } | null;
  subscription_details: { metadata: Record<string, string> } | null;
};

type StripeEvent = {
  type: string;
  data: { object: any };
};

const dynamoClient = new DynamoDBClient({});
const TENANT_POOLS_TABLE = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';
const STRIPE_WEBHOOK_SECRET = process.env['STRIPE_WEBHOOK_SECRET'] || '';
const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] || '';

/**
 * Stripe webhook handler for subscription lifecycle events.
 * Handles:
 * - checkout.session.completed — new subscription started
 * - customer.subscription.updated — plan change, renewal
 * - customer.subscription.deleted — cancellation
 * - invoice.payment_succeeded — successful payment
 * - invoice.payment_failed — failed payment
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig || !event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing signature or body' }) };
  }

  // Dynamically import stripe to avoid constructor issues at module level
  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  let stripeEvent: StripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, STRIPE_WEBHOOK_SECRET) as unknown as StripeEvent;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(stripeEvent.data.object as StripeCheckoutSession);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(stripeEvent.data.object as StripeSubscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(stripeEvent.data.object as StripeSubscription);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(stripeEvent.data.object as StripeInvoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(stripeEvent.data.object as StripeInvoice);
      break;
    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}

async function handleCheckoutCompleted(session: StripeCheckoutSession): Promise<void> {
  const subdomain = session.metadata?.['subdomain'];
  if (!subdomain) return;

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET stripeCustomerId = :cid, stripeSubscriptionId = :sid, subscriptionStatus = :status, billingEmail = :email',
    ExpressionAttributeValues: {
      ':cid': { S: customerId || '' },
      ':sid': { S: subscriptionId || '' },
      ':status': { S: 'active' },
      ':email': { S: session.customer_email || '' },
    },
  }));
}

async function handleSubscriptionUpdated(subscription: StripeSubscription): Promise<void> {
  const subdomain = subscription.metadata?.['subdomain'];
  if (!subdomain) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = mapPriceToPlan(priceId || '');

  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET #p = :plan, subscriptionStatus = :status, currentPeriodEnd = :periodEnd',
    ExpressionAttributeNames: { '#p': 'plan' },
    ExpressionAttributeValues: {
      ':plan': { S: plan },
      ':status': { S: subscription.status },
      ':periodEnd': { S: new Date(subscription.current_period_end * 1000).toISOString() },
    },
  }));
}

async function handleSubscriptionDeleted(subscription: StripeSubscription): Promise<void> {
  const subdomain = subscription.metadata?.['subdomain'];
  if (!subdomain) return;

  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET subscriptionStatus = :status, #p = :plan',
    ExpressionAttributeNames: { '#p': 'plan' },
    ExpressionAttributeValues: {
      ':status': { S: 'canceled' },
      ':plan': { S: 'starter' },
    },
  }));
}

async function handlePaymentSucceeded(invoice: StripeInvoice): Promise<void> {
  const subdomain = invoice.subscription_details?.metadata?.['subdomain']
    || (typeof invoice.subscription === 'object' ? invoice.subscription?.metadata?.['subdomain'] : undefined);
  if (!subdomain) return;

  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET lastPaymentDate = :date, lastPaymentAmount = :amount, paymentStatus = :status',
    ExpressionAttributeValues: {
      ':date': { S: new Date().toISOString() },
      ':amount': { N: String(invoice.amount_paid || 0) },
      ':status': { S: 'succeeded' },
    },
  }));
}

async function handlePaymentFailed(invoice: StripeInvoice): Promise<void> {
  const subdomain = invoice.subscription_details?.metadata?.['subdomain']
    || (typeof invoice.subscription === 'object' ? invoice.subscription?.metadata?.['subdomain'] : undefined);
  if (!subdomain) return;

  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET paymentStatus = :status, lastPaymentFailure = :date',
    ExpressionAttributeValues: {
      ':status': { S: 'failed' },
      ':date': { S: new Date().toISOString() },
    },
  }));
}

function mapPriceToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    [process.env['STRIPE_PRICE_STARTER'] || 'price_starter']: 'starter',
    [process.env['STRIPE_PRICE_PROFESSIONAL'] || 'price_professional']: 'professional',
    [process.env['STRIPE_PRICE_ENTERPRISE'] || 'price_enterprise']: 'enterprise',
  };
  return priceMap[priceId] || 'starter';
}
