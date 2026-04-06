/**
 * Human Review Gate Lambda handler.
 *
 * 1. When invoked by Step Functions (with taskToken): sends SES notification to admins
 * 2. When invoked by API (approve/reject): calls Step Functions SendTaskSuccess/Failure
 */
import {
  SFNClient,
  SendTaskSuccessCommand,
  SendTaskFailureCommand,
} from '@aws-sdk/client-sfn';
import {
  SESClient,
  SendEmailCommand,
} from '@aws-sdk/client-ses';
import { HumanReviewDecisionSchema } from '../schemas.js';

const sfnClient = new SFNClient({});
const sesClient = new SESClient({});

const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@ascendion.engineering';
const FROM_EMAIL = process.env['FROM_EMAIL'] ?? 'noreply@ascendion.engineering';
const REVIEW_URL_BASE = process.env['REVIEW_URL_BASE'] ?? 'https://ascendion.engineering/admin/review';

interface StepFunctionsInvocation {
  taskToken: string;
  contentId: string;
  review: { overallScore: number; summary: string };
  seo: { metaTitle: string };
  blocks: unknown[];
}

interface ApiInvocation {
  action: 'approve' | 'reject';
  contentId: string;
  taskToken: string;
  feedback?: string;
  reviewerId: string;
}

export async function handler(event: StepFunctionsInvocation | ApiInvocation): Promise<unknown> {
  // If this is the Step Functions invocation (has taskToken but no action), send email
  if ('taskToken' in event && !('action' in event)) {
    return handleStepFunctionsInvocation(event as StepFunctionsInvocation);
  }

  // If this is an API-triggered approve/reject
  if ('action' in event) {
    return handleApiDecision(event as ApiInvocation);
  }

  throw new Error('Invalid event: missing taskToken or action');
}

async function handleStepFunctionsInvocation(event: StepFunctionsInvocation): Promise<void> {
  const { taskToken, contentId, review, seo } = event;

  const reviewUrl = `${REVIEW_URL_BASE}/${contentId}?token=${encodeURIComponent(taskToken)}`;

  await sesClient.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [ADMIN_EMAIL] },
      Message: {
        Subject: {
          Data: `[ChiselGrid] Content ready for review: ${seo.metaTitle}`,
        },
        Body: {
          Html: {
            Data: `
              <h2>Content Ready for Review</h2>
              <p><strong>Title:</strong> ${seo.metaTitle}</p>
              <p><strong>AI Quality Score:</strong> ${review.overallScore}/100</p>
              <p><strong>Summary:</strong> ${review.summary}</p>
              <p><a href="${reviewUrl}">Review and Approve/Reject</a></p>
              <hr/>
              <p style="color: #666; font-size: 12px;">This is an automated notification from ChiselGrid content pipeline.</p>
            `,
          },
          Text: {
            Data: `Content ready for review: ${seo.metaTitle}\nScore: ${review.overallScore}/100\n\nReview: ${reviewUrl}`,
          },
        },
      },
    }),
  );
}

async function handleApiDecision(event: ApiInvocation): Promise<{ statusCode: number; body: string }> {
  const { action, taskToken, contentId, feedback, reviewerId } = event;

  if (action === 'approve') {
    await sfnClient.send(
      new SendTaskSuccessCommand({
        taskToken,
        output: JSON.stringify({
          decision: 'approve',
          reviewerId,
          feedback: feedback ?? '',
          contentId,
        }),
      }),
    );
  } else {
    await sfnClient.send(
      new SendTaskFailureCommand({
        taskToken,
        error: 'ContentRejected',
        cause: JSON.stringify({
          decision: 'reject',
          reviewerId,
          feedback: feedback ?? '',
          contentId,
        }),
      }),
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Content ${contentId} ${action}d`, contentId }),
  };
}
