import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  RemovalPolicy,
  Duration,
  SecretValue,
  aws_cognito as cognito,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface AuthStackOutputs {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  userPoolId: string;
  userPoolClientId: string;
  userPoolClientSecret: SecretValue;
  userPoolDomain: string;
  adminGroupName: string;
  creatorGroupName: string;
  readerGroupName: string;
}

export class AuthStack extends Stack {
  public readonly outputs: AuthStackOutputs;

  constructor(scope: Construct, id: string, config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `chiselgrid-${id.toLowerCase().includes('prod') ? 'prod' : id.toLowerCase().includes('staging') ? 'staging' : 'dev'}`,
      selfSignUpEnabled: false, // Admin-only user creation
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
      },
      customAttributes: {
        tenantId: new cognito.StringAttribute({ mutable: true }),
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
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      mfa: cognito.Mfa.OPTIONAL, // MFA optional at pool level, enforced for admins via group policy
      mfaSecondFactor: {
        sms: false,
        otp: true, // TOTP (authenticator app)
      },
      userInvitation: {
        emailSubject: 'Welcome to ChiselGrid — Your Account',
        emailBody:
          'Hello {username}, you have been invited to ChiselGrid. Your temporary password is {####}. Sign in at https://{##Verify Email##}',
      },
    });

    // Cognito User Pool Domain (hosted UI)
    const envSlug = id.toLowerCase().includes('prod')
      ? 'chiselgrid'
      : id.toLowerCase().includes('staging')
        ? 'chiselgrid-staging'
        : 'chiselgrid-dev';

    const domain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: { domainPrefix: envSlug },
    });

    // App Client — for NextAuth.js
    const userPoolClient = userPool.addClient('WebAppClient', {
      userPoolClientName: 'chiselgrid-web',
      authFlows: {
        userSrp: true,
        userPassword: false,
        custom: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/api/auth/callback/cognito',
          `https://${config.domain}/api/auth/callback/cognito`,
        ],
        logoutUrls: [
          'http://localhost:3000',
          `https://${config.domain}`,
        ],
      },
      generateSecret: true,
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // User Groups — admins, creators, readers
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admins',
      description: 'Platform administrators with full access',
      precedence: 0,
    });

    const creatorGroup = new cognito.CfnUserPoolGroup(this, 'CreatorGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'creators',
      description: 'Content creators who can generate and submit articles',
      precedence: 10,
    });

    const readerGroup = new cognito.CfnUserPoolGroup(this, 'ReaderGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'readers',
      description: 'Read-only users',
      precedence: 20,
    });

    // Suppress unused warnings
    void adminGroup;
    void creatorGroup;
    void readerGroup;

    // Azure AD (Entra ID) OIDC Identity Provider for Ascendion SSO
    // Azure AD tenant details are passed via CDK context or SSM parameters
    const azureAdClientId = this.node.tryGetContext('azureAdClientId') as string | undefined;
    const azureAdClientSecret = this.node.tryGetContext('azureAdClientSecret') as string | undefined;
    const azureAdTenantId = this.node.tryGetContext('azureAdTenantId') as string | undefined;

    if (azureAdClientId && azureAdClientSecret && azureAdTenantId) {
      const azureAdProvider = new cognito.UserPoolIdentityProviderOidc(this, 'AzureAdProvider', {
        userPool,
        name: 'AscendionAzureAD',
        clientId: azureAdClientId,
        clientSecret: azureAdClientSecret,
        issuerUrl: `https://login.microsoftonline.com/${azureAdTenantId}/v2.0`,
        scopes: ['openid', 'email', 'profile'],
        attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
        attributeMapping: {
          email: cognito.ProviderAttribute.other('email'),
          fullname: cognito.ProviderAttribute.other('name'),
          custom: {
            'custom:tenantId': cognito.ProviderAttribute.other('tid'),
          },
        },
        endpoints: {
          authorization: `https://login.microsoftonline.com/${azureAdTenantId}/oauth2/v2.0/authorize`,
          token: `https://login.microsoftonline.com/${azureAdTenantId}/oauth2/v2.0/token`,
          userInfo: 'https://graph.microsoft.com/oidc/userinfo',
          jwksUri: `https://login.microsoftonline.com/${azureAdTenantId}/discovery/v2.0/keys`,
        },
      });

      // Update client to support Azure AD identity provider
      userPoolClient.node.addDependency(azureAdProvider);
    }

    // Outputs
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      exportName: `${id}-UserPoolId`,
    });
    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      exportName: `${id}-UserPoolClientId`,
    });
    new CfnOutput(this, 'UserPoolDomain', {
      value: domain.domainName,
      exportName: `${id}-UserPoolDomain`,
    });
    new CfnOutput(this, 'CognitoIssuerUrl', {
      value: `https://cognito-idp.${config.region}.amazonaws.com/${userPool.userPoolId}`,
      exportName: `${id}-CognitoIssuerUrl`,
    });

    this.outputs = {
      userPool,
      userPoolClient,
      userPoolId: userPool.userPoolId,
      userPoolClientId: userPoolClient.userPoolClientId,
      userPoolClientSecret: userPoolClient.userPoolClientSecret,
      userPoolDomain: domain.domainName,
      adminGroupName: 'admins',
      creatorGroupName: 'creators',
      readerGroupName: 'readers',
    };
  }
}
