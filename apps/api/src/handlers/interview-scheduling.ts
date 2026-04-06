/**
 * T-19.4 Interview Scheduling Handler
 *
 * Creates calendar events via ICS file format, sends via SES,
 * and triggers Expo push notification reminders 30 minutes before.
 */

import { z } from 'zod';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE ?? 'chiselgrid-interview-schedules';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'interviews@ascendion.engineering';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const ScheduleInterviewSchema = z.object({
  templateId: z.string(),
  templateName: z.string(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().min(5).max(120).default(30),
  participantEmail: z.string().email(),
  participantName: z.string(),
  expoPushToken: z.string().optional(),
  notes: z.string().optional(),
});

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
  // EventBridge scheduled trigger for reminders
  source?: string;
  'detail-type'?: string;
  detail?: {
    scheduleId: string;
  };
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
 * Generate ICS calendar event file content.
 */
function generateICS(params: {
  scheduleId: string;
  summary: string;
  description: string;
  startTime: Date;
  durationMinutes: number;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const { scheduleId, summary, description, startTime, durationMinutes, organizerEmail, attendeeEmail, attendeeName } = params;

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const formatDate = (d: Date): string =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  // ICS with VALARM for 30-minute reminder
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChiselGrid//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `UID:${scheduleId}@chiselgrid.com`,
    `ORGANIZER;CN=ChiselGrid:mailto:${organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeName}:mailto:${attendeeEmail}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Interview "${summary}" starts in 30 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Send ICS calendar invite via SES.
 */
async function sendCalendarInvite(params: {
  to: string;
  subject: string;
  bodyText: string;
  icsContent: string;
}): Promise<void> {
  const { to, subject, bodyText, icsContent } = params;

  const boundary = `boundary-${Date.now()}`;
  const icsBase64 = Buffer.from(icsContent).toString('base64');

  const rawMessage = [
    `From: ChiselGrid Interviews <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyText,
    '',
    `--${boundary}`,
    'Content-Type: text/calendar; charset=UTF-8; method=REQUEST',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="interview.ics"',
    '',
    icsBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  await ses.send(
    new SendEmailCommand({
      Content: {
        Raw: {
          Data: new TextEncoder().encode(rawMessage),
        },
      },
    }),
  );
}

/**
 * Send Expo push notification reminder.
 */
async function sendPushReminder(params: {
  expoPushToken: string;
  templateName: string;
  scheduledAt: string;
}): Promise<void> {
  const { expoPushToken, templateName, scheduledAt } = params;
  const time = new Date(scheduledAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      title: 'Interview Reminder',
      body: `Your "${templateName}" interview starts in 30 minutes (${time})`,
      data: { type: 'interview_reminder', templateName },
      sound: 'default',
      priority: 'high',
      channelId: 'interviews',
    }),
  });
}

export async function handler(event: LambdaEvent) {
  // Handle EventBridge reminder trigger
  if (event.source === 'chiselgrid.interviews' && event.detail?.scheduleId) {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: SCHEDULES_TABLE,
        KeyConditionExpression: 'scheduleId = :sid',
        ExpressionAttributeValues: marshall({ ':sid': event.detail.scheduleId }),
      }),
    );

    const schedule = result.Items?.[0] ? unmarshall(result.Items[0]) : null;
    if (schedule?.expoPushToken) {
      await sendPushReminder({
        expoPushToken: schedule.expoPushToken as string,
        templateName: schedule.templateName as string,
        scheduledAt: schedule.scheduledAt as string,
      });
    }

    return { statusCode: 200, body: 'Reminder sent' };
  }

  // Handle API requests
  const tenantId = event.requestContext?.authorizer?.tenantId ?? 'default';
  const userId = event.requestContext?.authorizer?.userId ?? '';
  const scheduleId = event.pathParameters?.id;

  try {
    // POST /interview-schedules — schedule new interview
    if (event.httpMethod === 'POST') {
      const parsed = ScheduleInterviewSchema.parse(JSON.parse(event.body ?? '{}'));
      const newScheduleId = generateId('sched');
      const scheduledDate = new Date(parsed.scheduledAt);

      // Generate ICS
      const icsContent = generateICS({
        scheduleId: newScheduleId,
        summary: `ChiselGrid Interview: ${parsed.templateName}`,
        description: `Voice interview using "${parsed.templateName}" template.${parsed.notes ? `\n\nNotes: ${parsed.notes}` : ''}`,
        startTime: scheduledDate,
        durationMinutes: parsed.durationMinutes,
        organizerEmail: FROM_EMAIL,
        attendeeEmail: parsed.participantEmail,
        attendeeName: parsed.participantName,
      });

      // Send calendar invite via SES
      await sendCalendarInvite({
        to: parsed.participantEmail,
        subject: `Interview Scheduled: ${parsed.templateName}`,
        bodyText: [
          `Hi ${parsed.participantName},`,
          '',
          `You have a ChiselGrid interview scheduled:`,
          `Template: ${parsed.templateName}`,
          `Date: ${scheduledDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          `Time: ${scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          `Duration: ${parsed.durationMinutes} minutes`,
          '',
          parsed.notes ? `Notes: ${parsed.notes}\n` : '',
          'Open the ChiselGrid mobile app at the scheduled time to begin recording.',
          '',
          'Attached is a calendar event (.ics) you can add to your calendar.',
        ].join('\n'),
        icsContent,
      });

      // Store schedule in DynamoDB
      const scheduleRecord = {
        scheduleId: newScheduleId,
        tenantId,
        userId,
        templateId: parsed.templateId,
        templateName: parsed.templateName,
        participantEmail: parsed.participantEmail,
        participantName: parsed.participantName,
        scheduledAt: parsed.scheduledAt,
        durationMinutes: parsed.durationMinutes,
        expoPushToken: parsed.expoPushToken ?? null,
        notes: parsed.notes ?? null,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };

      await dynamodb.send(
        new PutItemCommand({
          TableName: SCHEDULES_TABLE,
          Item: marshall(scheduleRecord, { removeUndefinedValues: true }),
        }),
      );

      return jsonResponse(201, {
        scheduleId: newScheduleId,
        status: 'scheduled',
        calendarInviteSent: true,
      });
    }

    // GET /interview-schedules — list user's schedules
    if (event.httpMethod === 'GET' && !scheduleId) {
      const result = await dynamodb.send(
        new QueryCommand({
          TableName: SCHEDULES_TABLE,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :uid',
          FilterExpression: 'tenantId = :tid',
          ExpressionAttributeValues: marshall({ ':uid': userId, ':tid': tenantId }),
        }),
      );

      const schedules = (result.Items ?? []).map((item) => unmarshall(item));
      return jsonResponse(200, { schedules });
    }

    // DELETE /interview-schedules/:id — cancel schedule
    if (event.httpMethod === 'DELETE' && scheduleId) {
      await dynamodb.send(
        new DeleteItemCommand({
          TableName: SCHEDULES_TABLE,
          Key: marshall({ scheduleId }),
        }),
      );
      return jsonResponse(200, { message: 'Schedule cancelled' });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(400, { error: 'Validation failed', details: err.errors });
    }
    console.error('Interview scheduling error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
