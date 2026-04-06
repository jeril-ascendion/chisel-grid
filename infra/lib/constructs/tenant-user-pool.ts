import {
  Duration,
  RemovalPolicy,
  aws_cognito as cognito,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface TenantUserPoolProps {
  tenantName: string;
  tenantSubdomain: string;
  callbackDomain: string;
  enableDeletion: boolean;
}

/**
 * CDK construct that creates an isolated Cognito User Pool for a tenant.
 * Each tenant gets their own User Pool with:
 * - Tenant-specific custom attributes (tenantId baked into JWT)
 * - Three standard groups (admins, creators, readers)
 * - OAuth configured for the tenant's subdomain
 * - Pre-token-generation Lambda trigger to inject tenantId claim
 */
export class TenantUserPool extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;

  constructor(scope: Construct, id: string, props: TenantUserPoolProps) {
    super(scope, id);

    const { tenantName, tenantSubdomain, callbackDomain, enableDeletion } = props;

    this.userPool = new cognito.UserPool(this, 'Pool', {
      userPoolName: `chiselgrid-tenant-${tenantSubdomain}`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
      },
      customAttributes: {
        tenantId: new cognito.StringAttribute({ mutable: false }),
        role: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      userInvitation: {
        emailSubject: `Welcome to ${tenantName} on ChiselGrid`,
        emailBody: `Hello {username}, you have been invited to ${tenantName}. Your temporary password is {####}.`,
      },
    });

    // Hosted UI domain for this tenant
    this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: `chiselgrid-${tenantSubdomain}` },
    });

    // App Client for this tenant
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `${tenantSubdomain}-web`,
      authFlows: { userSrp: true, custom: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/api/auth/callback/cognito',
          `https://${tenantSubdomain}.${callbackDomain}/api/auth/callback/cognito`,
        ],
        logoutUrls: [
          'http://localhost:3000',
          `https://${tenantSubdomain}.${callbackDomain}`,
        ],
      },
      generateSecret: true,
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    // Standard groups for the tenant
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admins',
      description: `${tenantName} administrators`,
      precedence: 0,
    });

    new cognito.CfnUserPoolGroup(this, 'CreatorGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'creators',
      description: `${tenantName} content creators`,
      precedence: 10,
    });

    new cognito.CfnUserPoolGroup(this, 'ReaderGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'readers',
      description: `${tenantName} readers`,
      precedence: 20,
    });

    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;
  }
}
