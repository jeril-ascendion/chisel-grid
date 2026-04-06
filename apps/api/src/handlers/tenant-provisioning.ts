import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  CreateGroupCommand,
  SetUserPoolMfaConfigCommand,
  AdminCreateUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { extractUserContext, jsonResponse } from '../types';

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});

const TENANT_POOLS_TABLE = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';
const CALLBACK_DOMAIN = process.env['CALLBACK_DOMAIN'] || 'chiselgrid.com';

interface CreateTenantPoolRequest {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
  customDomain?: string;
  plan: 'internal' | 'starter' | 'professional' | 'enterprise';
}

/**
 * Provisions a new Cognito User Pool for a tenant at runtime.
 * Called during self-service onboarding or admin-initiated tenant creation.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  if (!event.body) {
    return jsonResponse(400, { error: 'Request body required' });
  }

  const body = JSON.parse(event.body) as CreateTenantPoolRequest;
  const { tenantId, tenantName, subdomain, adminEmail, adminName, customDomain, plan } = body;

  if (!tenantId || !tenantName || !subdomain || !adminEmail || !adminName) {
    return jsonResponse(400, { error: 'Missing required fields: tenantId, tenantName, subdomain, adminEmail, adminName' });
  }

  // Create Cognito User Pool for tenant
  const createPoolResult = await cognitoClient.send(new CreateUserPoolCommand({
    PoolName: `chiselgrid-tenant-${subdomain}`,
    AutoVerifiedAttributes: ['email'],
    UsernameAttributes: ['email'],
    Schema: [
      { Name: 'email', Required: true, Mutable: true, AttributeDataType: 'String' },
      { Name: 'name', Required: true, Mutable: true, AttributeDataType: 'String' },
      { Name: 'custom:tenantId', Mutable: false, AttributeDataType: 'String', StringAttributeConstraints: { MaxLength: '36' } },
      { Name: 'custom:role', Mutable: true, AttributeDataType: 'String', StringAttributeConstraints: { MaxLength: '20' } },
    ],
    Policies: {
      PasswordPolicy: {
        MinimumLength: 12,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true,
        TemporaryPasswordValidityDays: 7,
      },
    },
    AccountRecoverySetting: {
      RecoveryMechanisms: [{ Name: 'verified_email', Priority: 1 }],
    },
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: true,
      InviteMessageTemplate: {
        EmailSubject: `Welcome to ${tenantName} on ChiselGrid`,
        EmailMessage: `Hello {username}, you have been invited to ${tenantName}. Your temporary password is {####}.`,
      },
    },
  }));

  const userPoolId = createPoolResult.UserPool?.Id;
  if (!userPoolId) {
    return jsonResponse(500, { error: 'Failed to create User Pool' });
  }

  // Enable MFA
  await cognitoClient.send(new SetUserPoolMfaConfigCommand({
    UserPoolId: userPoolId,
    MfaConfiguration: 'OPTIONAL',
    SoftwareTokenMfaConfiguration: { Enabled: true },
  }));

  // Create User Pool Client
  const createClientResult = await cognitoClient.send(new CreateUserPoolClientCommand({
    UserPoolId: userPoolId,
    ClientName: `${subdomain}-web`,
    GenerateSecret: true,
    ExplicitAuthFlows: ['ALLOW_USER_SRP_AUTH', 'ALLOW_CUSTOM_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
    AllowedOAuthFlows: ['code'],
    AllowedOAuthScopes: ['openid', 'email', 'profile'],
    AllowedOAuthFlowsUserPoolClient: true,
    CallbackURLs: [
      'http://localhost:3000/api/auth/callback/cognito',
      `https://${subdomain}.${CALLBACK_DOMAIN}/api/auth/callback/cognito`,
    ],
    LogoutURLs: [
      'http://localhost:3000',
      `https://${subdomain}.${CALLBACK_DOMAIN}`,
    ],
    SupportedIdentityProviders: ['COGNITO'],
    AccessTokenValidity: 1, // 1 hour
    IdTokenValidity: 1,
    RefreshTokenValidity: 30, // 30 days
    TokenValidityUnits: {
      AccessToken: 'hours',
      IdToken: 'hours',
      RefreshToken: 'days',
    },
    PreventUserExistenceErrors: 'ENABLED',
  }));

  const clientId = createClientResult.UserPoolClient?.ClientId;
  const clientSecret = createClientResult.UserPoolClient?.ClientSecret;

  // Create standard groups
  const groups = ['admins', 'creators', 'readers'];
  for (const groupName of groups) {
    await cognitoClient.send(new CreateGroupCommand({
      UserPoolId: userPoolId,
      GroupName: groupName,
      Description: `${tenantName} ${groupName}`,
      Precedence: groupName === 'admins' ? 0 : groupName === 'creators' ? 10 : 20,
    }));
  }

  // Create initial admin user
  await cognitoClient.send(new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: adminEmail,
    UserAttributes: [
      { Name: 'email', Value: adminEmail },
      { Name: 'name', Value: adminName },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'custom:tenantId', Value: tenantId },
      { Name: 'custom:role', Value: 'admin' },
    ],
    DesiredDeliveryMediums: ['EMAIL'],
  }));

  // Store tenant pool mapping in DynamoDB
  await dynamoClient.send(new PutItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Item: {
      subdomain: { S: subdomain },
      tenantId: { S: tenantId },
      tenantName: { S: tenantName },
      userPoolId: { S: userPoolId },
      userPoolClientId: { S: clientId || '' },
      userPoolClientSecret: { S: clientSecret || '' },
      customDomain: customDomain ? { S: customDomain } : { NULL: true },
      plan: { S: plan },
      cognitoIssuerUrl: { S: `https://cognito-idp.${process.env['AWS_REGION'] || 'ap-southeast-1'}.amazonaws.com/${userPoolId}` },
      createdAt: { S: new Date().toISOString() },
    },
  }));

  return jsonResponse(201, {
    tenantId,
    subdomain,
    userPoolId,
    userPoolClientId: clientId,
    cognitoIssuerUrl: `https://cognito-idp.${process.env['AWS_REGION'] || 'ap-southeast-1'}.amazonaws.com/${userPoolId}`,
    message: `Tenant ${tenantName} provisioned successfully. Admin invite sent to ${adminEmail}.`,
  });
}
