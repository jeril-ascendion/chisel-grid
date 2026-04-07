/**
 * T-21.1 Microsoft Graph Client
 *
 * Wraps @microsoft/microsoft-graph-client with per-tenant OAuth2 app credentials.
 * Tokens stored in AWS Secrets Manager. Auto-refreshes expired tokens.
 *
 * Required Azure AD App permissions:
 *   - Sites.ReadWrite.All
 *   - Files.ReadWrite.All
 *   - ChannelMessage.Read.All
 */

import { Client, type AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

export interface GraphClientConfig {
  tenantId: string;
  azureTenantId: string;
  clientId: string;
  secretArn: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Retrieve client secret from Secrets Manager.
 */
async function getClientSecret(secretArn: string): Promise<{
  clientSecret: string;
  azureTenantId: string;
  clientId: string;
}> {
  const result = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  const secret = JSON.parse(result.SecretString ?? '{}');
  return {
    clientSecret: secret.clientSecret,
    azureTenantId: secret.azureTenantId,
    clientId: secret.clientId,
  };
}

/**
 * Acquire OAuth2 access token using client credentials flow.
 */
async function acquireToken(config: GraphClientConfig): Promise<string> {
  const cacheKey = `${config.tenantId}:${config.clientId}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const { clientSecret, azureTenantId, clientId } = await getClientSecret(config.secretArn);
  const actualTenantId = azureTenantId || config.azureTenantId;
  const actualClientId = clientId || config.clientId;

  const tokenUrl = `https://login.microsoftonline.com/${actualTenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: actualClientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token acquisition failed: ${response.status} ${error}`);
  }

  const tokenData: TokenResponse = await response.json();

  tokenCache.set(cacheKey, {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  });

  return tokenData.access_token;
}

/**
 * Microsoft Graph Client wrapper with per-tenant authentication.
 */
export class MicrosoftGraphClient {
  private client: Client;
  private config: GraphClientConfig;

  constructor(config: GraphClientConfig) {
    this.config = config;

    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => acquireToken(config),
    };

    this.client = Client.initWithMiddleware({ authProvider });
  }

  /** List SharePoint sites accessible to the app. */
  async listSites(search?: string) {
    const endpoint = search
      ? `/sites?search=${encodeURIComponent(search)}`
      : '/sites?search=*';
    return this.client.api(endpoint).get();
  }

  /** Get items in a SharePoint document library. */
  async listDriveItems(siteId: string, driveId?: string, folderId?: string) {
    const drive = driveId ? `/drives/${driveId}` : '/drive';
    const path = folderId ? `${drive}/items/${folderId}/children` : `${drive}/root/children`;
    return this.client.api(`/sites/${siteId}${path}`).get();
  }

  /** Download a file's content from SharePoint. */
  async downloadFile(siteId: string, itemId: string): Promise<ArrayBuffer> {
    return this.client
      .api(`/sites/${siteId}/drive/items/${itemId}/content`)
      .get();
  }

  /** Get file metadata. */
  async getFileMetadata(siteId: string, itemId: string) {
    return this.client
      .api(`/sites/${siteId}/drive/items/${itemId}`)
      .get();
  }

  /** Read Teams channel messages (for ChannelMessage.Read.All). */
  async listChannelMessages(teamId: string, channelId: string) {
    return this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .top(50)
      .get();
  }

  /** Create a Graph API subscription for change notifications. */
  async createSubscription(params: {
    resource: string;
    changeType: string;
    notificationUrl: string;
    expirationDateTime: string;
    clientState: string;
  }) {
    return this.client.api('/subscriptions').post({
      changeType: params.changeType,
      notificationUrl: params.notificationUrl,
      resource: params.resource,
      expirationDateTime: params.expirationDateTime,
      clientState: params.clientState,
    });
  }

  /** Renew an existing subscription. */
  async renewSubscription(subscriptionId: string, expirationDateTime: string) {
    return this.client.api(`/subscriptions/${subscriptionId}`).patch({
      expirationDateTime,
    });
  }

  /** Delete a subscription. */
  async deleteSubscription(subscriptionId: string) {
    return this.client.api(`/subscriptions/${subscriptionId}`).delete();
  }

  /** Upload a file to SharePoint. */
  async uploadFile(siteId: string, folderPath: string, fileName: string, content: ArrayBuffer) {
    return this.client
      .api(`/sites/${siteId}/drive/root:/${folderPath}/${fileName}:/content`)
      .put(content);
  }

  get rawClient(): Client {
    return this.client;
  }
}
