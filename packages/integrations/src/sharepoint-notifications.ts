/**
 * T-21.2 SharePoint Change Notifications
 *
 * Manages Graph API subscriptions for document library changes.
 * Subscriptions expire every 3 days — renewal Lambda runs on EventBridge schedule.
 * Uses clientState secret for webhook validation.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { MicrosoftGraphClient, type GraphClientConfig } from './microsoft-graph.client';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const SUBSCRIPTIONS_TABLE = process.env.GRAPH_SUBSCRIPTIONS_TABLE ?? 'chiselgrid-graph-subscriptions';

interface SubscriptionRecord {
  subscriptionId: string;
  tenantId: string;
  resource: string;
  changeType: string;
  expirationDateTime: string;
  clientState: string;
  createdAt: string;
}

function generateClientState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class SharePointNotificationManager {
  private graphClient: MicrosoftGraphClient;
  private tenantId: string;
  private notificationUrl: string;

  constructor(params: {
    graphConfig: GraphClientConfig;
    notificationUrl: string;
  }) {
    this.graphClient = new MicrosoftGraphClient(params.graphConfig);
    this.tenantId = params.graphConfig.tenantId;
    this.notificationUrl = params.notificationUrl;
  }

  /**
   * Subscribe to changes on a SharePoint site's document library.
   * Expiration set to ~3 days (max allowed by Graph for drive items).
   */
  async subscribe(siteId: string, driveId?: string): Promise<SubscriptionRecord> {
    const resource = driveId
      ? `sites/${siteId}/drives/${driveId}/root`
      : `sites/${siteId}/drive/root`;

    const clientState = generateClientState();
    const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60_000).toISOString();

    const subscription = await this.graphClient.createSubscription({
      resource,
      changeType: 'created,updated,deleted',
      notificationUrl: this.notificationUrl,
      expirationDateTime,
      clientState,
    });

    const record: SubscriptionRecord = {
      subscriptionId: subscription.id,
      tenantId: this.tenantId,
      resource,
      changeType: 'created,updated,deleted',
      expirationDateTime,
      clientState,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.send(
      new PutItemCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        Item: marshall(record),
      }),
    );

    return record;
  }

  /**
   * Renew all subscriptions for this tenant.
   * Called by EventBridge scheduled rule every 2 days.
   */
  async renewAll(): Promise<{ renewed: number; failed: number }> {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        FilterExpression: 'tenantId = :tid',
        ExpressionAttributeValues: marshall({ ':tid': this.tenantId }),
      }),
    );

    const subscriptions = (result.Items ?? []).map((item: Record<string, unknown>) => unmarshall(item as any) as SubscriptionRecord);
    let renewed = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const newExpiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 60_000).toISOString();

        await this.graphClient.renewSubscription(sub.subscriptionId, newExpiration);

        await dynamodb.send(
          new UpdateItemCommand({
            TableName: SUBSCRIPTIONS_TABLE,
            Key: marshall({ subscriptionId: sub.subscriptionId }),
            UpdateExpression: 'SET expirationDateTime = :exp',
            ExpressionAttributeValues: marshall({ ':exp': newExpiration }),
          }),
        );

        renewed++;
      } catch (err) {
        console.error(`Failed to renew subscription ${sub.subscriptionId}:`, err);

        // Remove stale subscription
        await dynamodb.send(
          new DeleteItemCommand({
            TableName: SUBSCRIPTIONS_TABLE,
            Key: marshall({ subscriptionId: sub.subscriptionId }),
          }),
        );

        failed++;
      }
    }

    return { renewed, failed };
  }

  /**
   * Validate incoming webhook notification using clientState.
   */
  async validateNotification(subscriptionId: string, clientState: string): Promise<boolean> {
    const result = await dynamodb.send(
      new ScanCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        FilterExpression: 'subscriptionId = :sid',
        ExpressionAttributeValues: marshall({ ':sid': subscriptionId }),
      }),
    );

    const record = result.Items?.[0] ? unmarshall(result.Items[0]) as SubscriptionRecord : null;
    return record?.clientState === clientState;
  }

  /** Remove a subscription. */
  async unsubscribe(subscriptionId: string): Promise<void> {
    try {
      await this.graphClient.deleteSubscription(subscriptionId);
    } catch {
      // Subscription may already be expired
    }

    await dynamodb.send(
      new DeleteItemCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        Key: marshall({ subscriptionId }),
      }),
    );
  }
}
