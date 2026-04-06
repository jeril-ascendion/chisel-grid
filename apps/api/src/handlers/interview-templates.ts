/**
 * T-19.1 Interview Templates API Handler
 *
 * Stores interview templates in DynamoDB as JSON.
 * CRUD operations + seeding 5 standard templates on first access.
 *
 * Schema: {templateId, name, questions: [{id, text, followUp, expectedDuration}], category}
 */

import { z } from 'zod';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  DeleteItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const TABLE_NAME = process.env.INTERVIEW_TEMPLATES_TABLE ?? 'chiselgrid-interview-templates';

const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  followUp: z.string().optional(),
  expectedDuration: z.number().min(10).max(600), // seconds
});

const TemplateSchema = z.object({
  templateId: z.string(),
  tenantId: z.string(),
  name: z.string().min(1).max(200),
  questions: z.array(QuestionSchema).min(1).max(20),
  category: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  questions: z.array(
    z.object({
      text: z.string(),
      followUp: z.string().optional(),
      expectedDuration: z.number().min(10).max(600).default(120),
    }),
  ).min(1).max(20),
  category: z.string(),
});

type Template = z.infer<typeof TemplateSchema>;

interface LambdaEvent {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  body?: string;
  requestContext: {
    authorizer?: {
      tenantId: string;
      userId: string;
    };
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
 * 5 standard interview templates, seeded on first access per tenant.
 */
function getStandardTemplates(tenantId: string): Template[] {
  const now = new Date().toISOString();
  return [
    {
      templateId: generateId('tpl'),
      tenantId,
      name: 'Technical Deep Dive',
      category: 'engineering',
      createdAt: now,
      updatedAt: now,
      questions: [
        { id: generateId('q'), text: 'What problem does this technology solve?', followUp: 'Can you give a specific example from your recent work?', expectedDuration: 120 },
        { id: generateId('q'), text: 'Walk me through the architecture of your solution.', followUp: 'What were the key trade-offs you considered?', expectedDuration: 180 },
        { id: generateId('q'), text: 'What challenges did you face during implementation?', followUp: 'How did you overcome them?', expectedDuration: 120 },
        { id: generateId('q'), text: 'How does this compare to alternative approaches?', expectedDuration: 120 },
        { id: generateId('q'), text: 'What would you do differently if you started over?', expectedDuration: 90 },
      ],
    },
    {
      templateId: generateId('tpl'),
      tenantId,
      name: 'Project Retrospective',
      category: 'leadership',
      createdAt: now,
      updatedAt: now,
      questions: [
        { id: generateId('q'), text: 'Describe the project scope and your role.', expectedDuration: 120 },
        { id: generateId('q'), text: 'What went well during the project?', followUp: 'What contributed to those successes?', expectedDuration: 120 },
        { id: generateId('q'), text: 'What were the biggest challenges?', followUp: 'How did the team respond?', expectedDuration: 150 },
        { id: generateId('q'), text: 'What key lessons did you learn?', expectedDuration: 120 },
        { id: generateId('q'), text: 'What advice would you give to someone starting a similar project?', expectedDuration: 90 },
      ],
    },
    {
      templateId: generateId('tpl'),
      tenantId,
      name: 'Best Practices Walkthrough',
      category: 'engineering',
      createdAt: now,
      updatedAt: now,
      questions: [
        { id: generateId('q'), text: 'What best practice are you sharing today?', followUp: 'Why is it important?', expectedDuration: 120 },
        { id: generateId('q'), text: 'How did you discover or develop this practice?', expectedDuration: 90 },
        { id: generateId('q'), text: 'Walk through a step-by-step example.', expectedDuration: 180 },
        { id: generateId('q'), text: 'What are common mistakes people make?', expectedDuration: 120 },
        { id: generateId('q'), text: 'How can teams adopt this practice incrementally?', expectedDuration: 90 },
      ],
    },
    {
      templateId: generateId('tpl'),
      tenantId,
      name: 'Quick Tip',
      category: 'tips',
      createdAt: now,
      updatedAt: now,
      questions: [
        { id: generateId('q'), text: 'What tip are you sharing?', expectedDuration: 60 },
        { id: generateId('q'), text: 'When should engineers use this tip?', expectedDuration: 60 },
        { id: generateId('q'), text: 'Can you show a quick example?', expectedDuration: 120 },
      ],
    },
    {
      templateId: generateId('tpl'),
      tenantId,
      name: 'Client Success Story',
      category: 'business',
      createdAt: now,
      updatedAt: now,
      questions: [
        { id: generateId('q'), text: 'Describe the client and their challenge.', followUp: 'What were the business implications?', expectedDuration: 150 },
        { id: generateId('q'), text: 'What solution did your team deliver?', followUp: 'What technologies or approaches did you use?', expectedDuration: 180 },
        { id: generateId('q'), text: 'What were the measurable outcomes?', expectedDuration: 120 },
        { id: generateId('q'), text: 'What feedback did the client give?', expectedDuration: 90 },
        { id: generateId('q'), text: 'What can others learn from this engagement?', expectedDuration: 90 },
      ],
    },
  ];
}

async function seedTemplates(tenantId: string): Promise<Template[]> {
  const templates = getStandardTemplates(tenantId);
  for (const template of templates) {
    await dynamodb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(template, { removeUndefinedValues: true }),
        ConditionExpression: 'attribute_not_exists(templateId)',
      }),
    ).catch(() => { /* Already exists, skip */ });
  }
  return templates;
}

export async function handler(event: LambdaEvent) {
  const tenantId = event.requestContext.authorizer?.tenantId ?? 'default';
  const templateId = event.pathParameters?.id;

  try {
    // GET /interview-templates — list all templates for tenant
    if (event.httpMethod === 'GET' && !templateId) {
      const result = await dynamodb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'tenantId = :tid',
          ExpressionAttributeValues: marshall({ ':tid': tenantId }),
        }),
      );

      let templates = (result.Items ?? []).map((item) => unmarshall(item) as Template);

      // Seed if empty
      if (templates.length === 0) {
        templates = await seedTemplates(tenantId);
      }

      return jsonResponse(200, { templates });
    }

    // GET /interview-templates/:id
    if (event.httpMethod === 'GET' && templateId) {
      const result = await dynamodb.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ templateId }),
        }),
      );

      if (!result.Item) {
        return jsonResponse(404, { error: 'Template not found' });
      }

      const template = unmarshall(result.Item) as Template;
      if (template.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Template not found' });
      }

      return jsonResponse(200, { template });
    }

    // POST /interview-templates — create new template
    if (event.httpMethod === 'POST') {
      const parsed = CreateTemplateSchema.parse(JSON.parse(event.body ?? '{}'));
      const now = new Date().toISOString();

      const template: Template = {
        templateId: generateId('tpl'),
        tenantId,
        name: parsed.name,
        category: parsed.category,
        questions: parsed.questions.map((q) => ({
          id: generateId('q'),
          text: q.text,
          followUp: q.followUp,
          expectedDuration: q.expectedDuration,
        })),
        createdAt: now,
        updatedAt: now,
      };

      await dynamodb.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: marshall(template, { removeUndefinedValues: true }),
        }),
      );

      return jsonResponse(201, { template });
    }

    // PUT /interview-templates/:id — update template
    if (event.httpMethod === 'PUT' && templateId) {
      const existing = await dynamodb.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ templateId }),
        }),
      );

      if (!existing.Item) {
        return jsonResponse(404, { error: 'Template not found' });
      }

      const existingTemplate = unmarshall(existing.Item) as Template;
      if (existingTemplate.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Template not found' });
      }

      const parsed = CreateTemplateSchema.parse(JSON.parse(event.body ?? '{}'));
      const updated: Template = {
        ...existingTemplate,
        name: parsed.name,
        category: parsed.category,
        questions: parsed.questions.map((q) => ({
          id: generateId('q'),
          text: q.text,
          followUp: q.followUp,
          expectedDuration: q.expectedDuration,
        })),
        updatedAt: new Date().toISOString(),
      };

      await dynamodb.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: marshall(updated, { removeUndefinedValues: true }),
        }),
      );

      return jsonResponse(200, { template: updated });
    }

    // DELETE /interview-templates/:id
    if (event.httpMethod === 'DELETE' && templateId) {
      const existing = await dynamodb.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ templateId }),
        }),
      );

      if (existing.Item) {
        const template = unmarshall(existing.Item) as Template;
        if (template.tenantId !== tenantId) {
          return jsonResponse(404, { error: 'Template not found' });
        }
      }

      await dynamodb.send(
        new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ templateId }),
        }),
      );

      return jsonResponse(200, { message: 'Template deleted' });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(400, { error: 'Validation failed', details: err.errors });
    }
    console.error('Interview templates handler error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
