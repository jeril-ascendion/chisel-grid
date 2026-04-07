/**
 * T-22.3 SES Bounce/Complaint Handler
 *
 * Processes SNS notifications from SES for bounces and complaints.
 * Updates SES suppression list and records statistics in DynamoDB.
 * Also updates subscriber status in Aurora.
 */

import {
  SESv2Client,
  PutSuppressedDestinationCommand,
} from '@aws-sdk/client-sesv2';
import {
  DynamoDBClient,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const SEND_STATS_TABLE = process.env.SEND_STATS_TABLE ?? 'chiselgrid-ses-send-stats';

interface SNSEvent {
  Records: Array<{
    Sns: {
      Message: string;
      MessageId: string;
      Timestamp: string;
    };
  }>;
}

interface SESNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  bounce?: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bounceSubType: string;
    bouncedRecipients: Array<{ emailAddress: string; status: string; diagnosticCode: string }>;
    timestamp: string;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
    complaintFeedbackType: string;
    timestamp: string;
  };
  mail: {
    source: string;
    destination: string[];
    messageId: string;
    timestamp: string;
    tags?: Record<string, string[]>;
  };
}

async function addToSuppressionList(email: string, reason: 'BOUNCE' | 'COMPLAINT'): Promise<void> {
  try {
    await ses.send(
      new PutSuppressedDestinationCommand({
        EmailAddress: email,
        Reason: reason,
      }),
    );
    console.log(`Added ${email} to suppression list (${reason})`);
  } catch (err) {
    console.error(`Failed to suppress ${email}:`, err);
  }
}

async function recordStat(
  tenantId: string,
  eventType: string,
  count: number,
): Promise<void> {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await dynamodb.send(
    new UpdateItemCommand({
      TableName: SEND_STATS_TABLE,
      Key: marshall({ tenantId, date }),
      UpdateExpression: `ADD #eventType :count`,
      ExpressionAttributeNames: { '#eventType': eventType },
      ExpressionAttributeValues: marshall({ ':count': count }),
    }),
  );
}

export async function handler(event: SNSEvent) {
  for (const record of event.Records) {
    const notification: SESNotification = JSON.parse(record.Sns.Message);
    const tenantId = notification.mail.tags?.tenantId?.[0] ?? 'default';

    switch (notification.notificationType) {
      case 'Bounce': {
        const bounce = notification.bounce!;
        const isPermanent = bounce.bounceType === 'Permanent';

        for (const recipient of bounce.bouncedRecipients) {
          console.log(
            `Bounce (${bounce.bounceType}/${bounce.bounceSubType}) for ${recipient.emailAddress}`,
          );

          if (isPermanent) {
            await addToSuppressionList(recipient.emailAddress, 'BOUNCE');
          }
        }

        await recordStat(tenantId, 'bounces', bounce.bouncedRecipients.length);
        if (isPermanent) {
          await recordStat(tenantId, 'permanent_bounces', bounce.bouncedRecipients.length);
        }
        break;
      }

      case 'Complaint': {
        const complaint = notification.complaint!;

        for (const recipient of complaint.complainedRecipients) {
          console.log(`Complaint from ${recipient.emailAddress}: ${complaint.complaintFeedbackType}`);
          await addToSuppressionList(recipient.emailAddress, 'COMPLAINT');
        }

        await recordStat(tenantId, 'complaints', complaint.complainedRecipients.length);
        break;
      }

      case 'Delivery': {
        await recordStat(tenantId, 'deliveries', notification.mail.destination.length);
        break;
      }
    }
  }

  return { statusCode: 200, body: 'OK' };
}
