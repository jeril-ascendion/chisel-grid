import { NextResponse } from 'next/server';

/**
 * POST /api/onboarding
 * Creates a new tenant: provisions Cognito pool, creates DB record,
 * initiates Stripe checkout session, sends welcome email.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { plan, organizationName, subdomain, adminEmail, adminName } = body;

  if (!plan || !organizationName || !subdomain || !adminEmail || !adminName) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  // Validate subdomain format
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(subdomain)) {
    return NextResponse.json(
      { error: 'Invalid subdomain format' },
      { status: 400 },
    );
  }

  try {
    // In production, this would:
    // 1. Check subdomain uniqueness in DynamoDB
    // 2. Create tenant record in Aurora
    // 3. Provision Cognito User Pool (via tenant-provisioning Lambda)
    // 4. Create Stripe checkout session
    // 5. Return checkout URL

    const apiUrl = process.env['API_URL'] || 'http://localhost:4000';

    // For now, return a simulated response
    // In production, call the billing API to create checkout session
    return NextResponse.json({
      message: 'Tenant onboarding initiated',
      subdomain,
      portalUrl: `https://${subdomain}.chiselgrid.com`,
      // checkoutUrl would be returned from Stripe
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 },
    );
  }
}
