/**
 * T-19.3 Multi-Answer Interview Processor
 *
 * Each answer in an interview becomes a separate Step Functions execution,
 * all linked by interviewId foreign key. When all answers are processed,
 * they are published as a content series with series navigation.
 */

import { z } from 'zod';
import {
  SFNClient,
  StartExecutionCommand,
  DescribeExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const sfn = new SFNClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const INTERVIEWS_TABLE = process.env.INTERVIEWS_TABLE ?? 'chiselgrid-interviews';
const VOICE_PIPELINE_ARN = process.env.VOICE_PIPELINE_ARN ?? '';

const AnswerSchema = z.object({
  questionId: z.string(),
  s3Key: z.string().nullable(),
  durationMs: z.number(),
  skipped: z.boolean(),
});

const InterviewSubmissionSchema = z.object({
  interviewId: z.string(),
  tenantId: z.string(),
  templateId: z.string(),
  templateName: z.string(),
  category: z.string(),
  answers: z.array(AnswerSchema).min(1),
});

interface InterviewRecord {
  interviewId: string;
  tenantId: string;
  templateId: string;
  templateName: string;
  category: string;
  userId: string;
  totalAnswers: number;
  processedAnswers: number;
  status: 'processing' | 'completed' | 'failed' | 'published';
  answers: Array<{
    questionId: string;
    s3Key: string | null;
    durationMs: number;
    skipped: boolean;
    executionArn: string | null;
    contentId: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  }>;
  seriesId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LambdaEvent {
  httpMethod?: string;
  path?: string;
  pathParameters?: Record<string, string>;
  body?: string;
  requestContext?: {
    authorizer?: {
      tenantId: string;
      userId: string;
    };
  };
  // Step Functions callback event
  detail?: {
    interviewId: string;
    questionId: string;
    contentId: string;
    status: 'completed' | 'failed';
  };
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Start Step Functions execution for each non-skipped answer.
 */
async function processInterview(interview: InterviewRecord): Promise<void> {
  for (const answer of interview.answers) {
    if (answer.skipped || !answer.s3Key) {
      answer.status = 'skipped';
      continue;
    }

    try {
      const execution = await sfn.send(
        new StartExecutionCommand({
          stateMachineArn: VOICE_PIPELINE_ARN,
          name: `interview-${interview.interviewId}-${answer.questionId}`,
          input: JSON.stringify({
            tenantId: interview.tenantId,
            audioS3Key: answer.s3Key,
            audioS3Bucket: process.env.MEDIA_BUCKET ?? 'chiselgrid-media',
            userId: interview.userId,
            title: `${interview.templateName} — Q${interview.answers.indexOf(answer) + 1}`,
            source: 'interview',
            interviewId: interview.interviewId,
            questionId: answer.questionId,
            seriesMetadata: {
              seriesName: interview.templateName,
              category: interview.category,
              totalParts: interview.answers.filter((a) => !a.skipped).length,
              partNumber: interview.answers.filter((a) => !a.skipped).indexOf(answer) + 1,
            },
          }),
        }),
      );

      answer.executionArn = execution.executionArn ?? null;
      answer.status = 'processing';
    } catch (err) {
      console.error(`Failed to start execution for ${answer.questionId}:`, err);
      answer.status = 'failed';
    }
  }

  // Save interview record
  await dynamodb.send(
    new PutItemCommand({
      TableName: INTERVIEWS_TABLE,
      Item: marshall(interview, { removeUndefinedValues: true }),
    }),
  );
}

/**
 * Handle answer completion callback from Step Functions.
 */
async function handleAnswerCompletion(
  interviewId: string,
  questionId: string,
  contentId: string,
  status: 'completed' | 'failed',
): Promise<void> {
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: INTERVIEWS_TABLE,
      Key: marshall({ interviewId }),
    }),
  );

  if (!result.Item) {
    console.error(`Interview not found: ${interviewId}`);
    return;
  }

  const interview = unmarshall(result.Item) as InterviewRecord;
  const answer = interview.answers.find((a) => a.questionId === questionId);

  if (answer) {
    answer.status = status;
    answer.contentId = status === 'completed' ? contentId : null;
  }

  interview.processedAnswers = interview.answers.filter(
    (a) => a.status === 'completed' || a.status === 'failed' || a.status === 'skipped',
  ).length;

  // Check if all answers are done
  if (interview.processedAnswers === interview.totalAnswers) {
    const allCompleted = interview.answers.every(
      (a) => a.status === 'completed' || a.status === 'skipped',
    );
    interview.status = allCompleted ? 'completed' : 'failed';

    // Generate series ID for linking content
    if (allCompleted) {
      interview.seriesId = `series-${interview.interviewId}`;
    }
  }

  interview.updatedAt = new Date().toISOString();

  await dynamodb.send(
    new PutItemCommand({
      TableName: INTERVIEWS_TABLE,
      Item: marshall(interview, { removeUndefinedValues: true }),
    }),
  );
}

export async function handler(event: LambdaEvent) {
  // Handle Step Functions callback
  if (event.detail) {
    const { interviewId, questionId, contentId, status } = event.detail;
    await handleAnswerCompletion(interviewId, questionId, contentId, status);
    return { statusCode: 200, body: 'OK' };
  }

  // Handle API requests
  const tenantId = event.requestContext?.authorizer?.tenantId ?? 'default';
  const userId = event.requestContext?.authorizer?.userId ?? '';
  const interviewId = event.pathParameters?.id;

  try {
    // POST /interviews — submit new interview for processing
    if (event.httpMethod === 'POST' && !interviewId) {
      const parsed = InterviewSubmissionSchema.parse(JSON.parse(event.body ?? '{}'));

      const interview: InterviewRecord = {
        interviewId: parsed.interviewId,
        tenantId: parsed.tenantId,
        templateId: parsed.templateId,
        templateName: parsed.templateName,
        category: parsed.category,
        userId,
        totalAnswers: parsed.answers.length,
        processedAnswers: 0,
        status: 'processing',
        answers: parsed.answers.map((a) => ({
          ...a,
          executionArn: null,
          contentId: null,
          status: a.skipped ? ('skipped' as const) : ('pending' as const),
        })),
        seriesId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await processInterview(interview);

      return jsonResponse(202, {
        interviewId: interview.interviewId,
        status: 'processing',
        totalAnswers: interview.totalAnswers,
      });
    }

    // GET /interviews/:id — get interview status
    if (event.httpMethod === 'GET' && interviewId) {
      const result = await dynamodb.send(
        new GetItemCommand({
          TableName: INTERVIEWS_TABLE,
          Key: marshall({ interviewId }),
        }),
      );

      if (!result.Item) {
        return jsonResponse(404, { error: 'Interview not found' });
      }

      const interview = unmarshall(result.Item) as InterviewRecord;
      if (interview.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Interview not found' });
      }

      return jsonResponse(200, { interview });
    }

    // GET /interviews — list user's interviews
    if (event.httpMethod === 'GET' && !interviewId) {
      const result = await dynamodb.send(
        new QueryCommand({
          TableName: INTERVIEWS_TABLE,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :uid',
          FilterExpression: 'tenantId = :tid',
          ExpressionAttributeValues: marshall({ ':uid': userId, ':tid': tenantId }),
        }),
      );

      const interviews = (result.Items ?? []).map((item) => unmarshall(item));
      return jsonResponse(200, { interviews });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(400, { error: 'Validation failed', details: err.errors });
    }
    console.error('Interview processor error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
