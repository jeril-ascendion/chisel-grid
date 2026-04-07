import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, role, sendWelcomeEmail } = body;

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // In production:
  // 1. Create Cognito user via admin-create-user
  // 2. Add to Cognito group (admins/creators/readers)
  // 3. Send welcome email via SES if sendWelcomeEmail
  // 4. Insert into Aurora users table

  const newUser = {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    enabled: true,
    lastLogin: 'Never',
    createdAt: new Date().toISOString().split('T')[0],
    sendWelcomeEmail: sendWelcomeEmail ?? true,
  };

  return NextResponse.json(newUser, { status: 201 });
}
