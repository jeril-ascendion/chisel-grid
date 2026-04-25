import {
  assemblePrompt,
  loadSelectedSkills,
  mergeWithTenantSkills,
  selectSkillsFor,
  type SkillFile,
} from '../skills';

const BASE_PRELUDE = `
You are Grid, an expert AWS Solutions Architect.

You produce ONLY valid Grid-IR JSON. No explanation. No markdown. No fences.
Start your response with { and end with }.
`.trim();

const SCHEMA_BLOCK = `
GRID-IR SCHEMA:
{
  "version": "1.0",
  "diagram_type": "string",
  "abstraction_level": 2,
  "title": "string",
  "nodes": [
    {
      "id": "kebab-case-id",
      "type": "aws.service_name",
      "label": "Display Label",
      "zone": "public|private|external|compliance|data",
      "position": { "x": number, "y": number },
      "properties": { "key": "value" }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "source-id",
      "to": "target-id",
      "label": "action",
      "protocol": "HTTPS|async|SQL|IAM",
      "animated": true
    }
  ],
  "zones": [
    { "id": "zone-id", "label": "Zone Name", "color": "#hexcolor" }
  ],
  "metadata": { "tenant_id": "", "created_by": "", "created_at": "", "tags": [] }
}

Valid node types:
aws.waf, aws.cloudfront, aws.api_gateway, aws.lambda, aws.cognito,
aws.aurora, aws.s3, aws.sqs, aws.sns, aws.kms, aws.secrets_manager,
aws.cloudwatch, aws.cloudtrail, aws.nat_gateway, aws.vpc,
aws.elasticache, aws.dynamodb, aws.step_functions, aws.eventbridge
external.user, external.system, external.payment_network

SELF-CHECK before outputting — verify all:
□ Serverless? No EC2, no ALB.
□ Cognito attached to API Gateway not downstream?
□ WAF present for financial/payment/banking?
□ SQS+DLQ present for payment processing?
□ Node positions set for left-to-right layout?
□ IAM as node properties not standalone nodes?
□ Philippine bank? InstaPay and BSP nodes present?
□ PCI-DSS zone contains ONLY payment-touching components?

Output ONLY the Grid-IR JSON object. Nothing else.
`.trim();

export interface BuildPromptInput {
  prompt: string;
  diagramType: string;
  context?: string;
  tenantSkills?: SkillFile[];
}

export interface BuiltPrompt {
  systemPrompt: string;
  skillNames: string[];
  estimatedTokens: number;
}

export function buildArchitecturePrompt(input: BuildPromptInput): BuiltPrompt {
  const selected = selectSkillsFor({
    prompt: input.prompt,
    diagramType: input.diagramType,
    ...(input.context ? { context: input.context } : {}),
  });

  const skills = input.tenantSkills && input.tenantSkills.length > 0
    ? mergeWithTenantSkills(selected, input.tenantSkills)
    : loadSelectedSkills(selected);

  const systemPrompt = assemblePrompt(BASE_PRELUDE, skills, {
    schemaBlock: SCHEMA_BLOCK,
  });

  return {
    systemPrompt,
    skillNames: skills.map((s) => s.name),
    estimatedTokens: Math.ceil(systemPrompt.length / 4),
  };
}

export { BASE_PRELUDE, SCHEMA_BLOCK };
