import { SESv2Client, SendBulkEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

export interface NewsletterRecipient {
  email: string;
  subscriberId: string;
  tenantName: string;
}

export interface BulkNewsletterParams {
  fromEmail: string;
  templateName: string;
  templateData: Record<string, string>;
  recipients: NewsletterRecipient[];
}

/**
 * Send bulk newsletter emails via AWS SES SendBulkEmail.
 * Recipients are batched in groups of 50 (SES limit per call).
 */
export async function sendBulkNewsletter(params: BulkNewsletterParams): Promise<{
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}> {
  const { fromEmail, templateName, templateData, recipients } = params;
  const batchSize = 50;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const command = new SendBulkEmailCommand({
      FromEmailAddress: fromEmail,
      DefaultContent: {
        Template: {
          TemplateName: templateName,
          TemplateData: JSON.stringify(templateData),
        },
      },
      BulkEmailEntries: batch.map((recipient) => ({
        Destination: {
          ToAddresses: [recipient.email],
        },
        ReplacementEmailContent: {
          ReplacementTemplate: {
            ReplacementTemplateData: JSON.stringify({
              subscriberId: recipient.subscriberId,
              unsubscribeUrl: `${templateData.siteUrl}/api/unsubscribe?id=${recipient.subscriberId}`,
              preferencesUrl: `${templateData.siteUrl}/api/preferences?id=${recipient.subscriberId}`,
            }),
          },
        },
      })),
    });

    try {
      const result = await ses.send(command);

      if (result.BulkEmailEntryResults) {
        for (let j = 0; j < result.BulkEmailEntryResults.length; j++) {
          const entry = result.BulkEmailEntryResults[j];
          if (entry.Status === 'SUCCESS') {
            sent++;
          } else {
            failed++;
            errors.push({
              email: batch[j].email,
              error: entry.Error ?? 'Unknown SES error',
            });
          }
        }
      }
    } catch (err) {
      // Entire batch failed
      failed += batch.length;
      for (const recipient of batch) {
        errors.push({
          email: recipient.email,
          error: err instanceof Error ? err.message : 'Batch send failed',
        });
      }
    }
  }

  return { sent, failed, errors };
}
