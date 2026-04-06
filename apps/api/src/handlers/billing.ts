import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { extractUserContext, jsonResponse } from '../types';

const dynamoClient = new DynamoDBClient({});
const TENANT_POOLS_TABLE = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';
const BASE_URL = process.env['BASE_URL'] || 'https://chiselgrid.com';
const STRIPE_SECRET_KEY = process.env['STRIPE_SECRET_KEY'] || '';

const PRICE_IDS: Record<string, string> = {
  starter: process.env['STRIPE_PRICE_STARTER'] || 'price_starter',
  professional: process.env['STRIPE_PRICE_PROFESSIONAL'] || 'price_professional',
  enterprise: process.env['STRIPE_PRICE_ENTERPRISE'] || 'price_enterprise',
};

/**
 * Billing API handler.
 * POST /billing/checkout — Create a Stripe Checkout session
 * POST /billing/portal — Create a Stripe Customer Portal session
 * GET /billing/status — Get current billing status
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const path = event.path || '';
  const method = event.httpMethod;

  if (method === 'POST' && path.endsWith('/checkout')) {
    return handleCreateCheckout(event);
  } else if (method === 'POST' && path.endsWith('/portal')) {
    return handleCreatePortal(event);
  } else if (method === 'GET' && path.endsWith('/status')) {
    return handleGetBillingStatus(event);
  }

  return jsonResponse(404, { error: 'Not found' });
}

async function getStripe() {
  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  return new Stripe(STRIPE_SECRET_KEY);
}

async function handleCreateCheckout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return jsonResponse(400, { error: 'Request body required' });
  }

  const { plan, subdomain } = JSON.parse(event.body) as { plan: string; subdomain: string };
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return jsonResponse(400, { error: `Invalid plan: ${plan}` });
  }

  const tenantData = await dynamoClient.send(new GetItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    ProjectionExpression: 'stripeCustomerId, tenantId',
  }));

  const existingCustomerId = tenantData.Item?.['stripeCustomerId']?.S;
  const tenantId = tenantData.Item?.['tenantId']?.S || '';

  const stripe = await getStripe();
  const sessionParams: Record<string, any> = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${BASE_URL}/admin/tenant?billing=success`,
    cancel_url: `${BASE_URL}/admin/tenant?billing=canceled`,
    metadata: { subdomain, tenantId },
    subscription_data: { metadata: { subdomain, tenantId } },
  };

  if (existingCustomerId) {
    sessionParams.customer = existingCustomerId;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return jsonResponse(200, { checkoutUrl: session.url });
}

async function handleCreatePortal(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return jsonResponse(400, { error: 'Request body required' });
  }

  const { subdomain } = JSON.parse(event.body) as { subdomain: string };

  const tenantData = await dynamoClient.send(new GetItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    ProjectionExpression: 'stripeCustomerId',
  }));

  const customerId = tenantData.Item?.['stripeCustomerId']?.S;
  if (!customerId) {
    return jsonResponse(400, { error: 'No Stripe customer found for this tenant' });
  }

  const stripe = await getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${BASE_URL}/admin/tenant`,
  });

  return jsonResponse(200, { portalUrl: session.url });
}

async function handleGetBillingStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const subdomain = event.queryStringParameters?.['subdomain'];
  if (!subdomain) {
    return jsonResponse(400, { error: 'Missing subdomain query parameter' });
  }

  const result = await dynamoClient.send(new GetItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    ProjectionExpression: '#p, subscriptionStatus, currentPeriodEnd, lastPaymentDate, lastPaymentAmount, paymentStatus, stripeSubscriptionId',
    ExpressionAttributeNames: { '#p': 'plan' },
  }));

  if (!result.Item) {
    return jsonResponse(404, { error: 'Tenant not found' });
  }

  return jsonResponse(200, {
    plan: result.Item['plan']?.S || 'starter',
    subscriptionStatus: result.Item['subscriptionStatus']?.S || 'none',
    currentPeriodEnd: result.Item['currentPeriodEnd']?.S || null,
    lastPaymentDate: result.Item['lastPaymentDate']?.S || null,
    lastPaymentAmountCents: Number(result.Item['lastPaymentAmount']?.N || '0'),
    paymentStatus: result.Item['paymentStatus']?.S || 'none',
    hasActiveSubscription: result.Item['subscriptionStatus']?.S === 'active',
  });
}
