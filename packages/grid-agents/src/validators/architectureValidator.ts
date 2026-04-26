import type { GridIR } from '@chiselgrid/grid-ir';

export interface ValidationFinding {
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
  fix: string;
  affectedNodeIds?: string[];
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  findings: ValidationFinding[];
  criticalCount: number;
  warningCount: number;
}

export function validateArchitecture(
  gridIR: GridIR,
  diagramType: string,
): ValidationResult {
  void diagramType;
  const findings: ValidationFinding[] = [];
  const nodeTypes = gridIR.nodes.map((n) => n.type.toLowerCase());
  const nodeLabels = gridIR.nodes.map((n) => n.label.toLowerCase());
  const titleAndTags = [
    gridIR.title.toLowerCase(),
    ...(gridIR.metadata?.tags || []),
  ].join(' ');

  const has = (type: string) => nodeTypes.some((t) => t.includes(type));
  const hasLabel = (label: string) => nodeLabels.some((l) => l.includes(label));

  const isServerless = has('lambda') && !has('ec2') && !has('ecs');
  const hasALB = has('load_balancer') || has('alb') || has('ec2');
  const isPayment =
    titleAndTags.includes('payment') ||
    titleAndTags.includes('bank') ||
    titleAndTags.includes('fintech') ||
    titleAndTags.includes('pci');
  const isPhilippine =
    titleAndTags.includes('union bank') ||
    titleAndTags.includes('philippine') ||
    titleAndTags.includes('bsp') ||
    titleAndTags.includes('ph');

  // CRITICAL: No ALB in serverless
  if (isServerless && hasALB) {
    findings.push({
      severity: 'critical',
      rule: 'SERVERLESS_NO_ALB',
      message:
        'Application Load Balancer found in serverless architecture. This is architecturally incorrect.',
      fix: 'Remove ALB and EC2 nodes. API Gateway handles routing for Lambda.',
      affectedNodeIds: gridIR.nodes
        .filter(
          (n) =>
            n.type.toLowerCase().includes('load_balancer') ||
            n.type.toLowerCase().includes('ec2'),
        )
        .map((n) => n.id),
    });
  }

  // CRITICAL: Payment needs WAF
  if (isPayment && !has('waf')) {
    findings.push({
      severity: 'critical',
      rule: 'PAYMENT_NEEDS_WAF',
      message:
        'Payment system missing WAF. Required by PCI-DSS DSS Requirement 6.4.',
      fix: 'Add aws.waf node positioned in front of CloudFront.',
    });
  }

  // CRITICAL: Payment needs async processing
  if (isPayment && !has('sqs') && !has('sns') && !has('eventbridge')) {
    findings.push({
      severity: 'critical',
      rule: 'PAYMENT_NEEDS_ASYNC',
      message:
        'Payment processing is synchronous. Financial transactions must use async queuing with retry.',
      fix: 'Add aws.sqs node with DLQ between API Lambda and Payment Processor Lambda.',
    });
  }

  // CRITICAL: Payment needs KMS
  if (isPayment && !has('kms')) {
    findings.push({
      severity: 'critical',
      rule: 'PAYMENT_NEEDS_KMS',
      message:
        'No KMS encryption key management. PCI-DSS Requirement 3.4 mandates encryption at rest.',
      fix: 'Add aws.kms node. Connect to Aurora and S3 nodes.',
    });
  }

  // WARNING: Payment needs CloudTrail
  if (isPayment && !has('cloudtrail')) {
    findings.push({
      severity: 'warning',
      rule: 'PAYMENT_NEEDS_AUDIT',
      message:
        'No CloudTrail audit logging. PCI-DSS Requirement 10 mandates comprehensive audit trails.',
      fix: 'Add aws.cloudtrail node to capture all API calls.',
    });
  }

  // WARNING: Secrets Manager
  if (isPayment && !has('secrets')) {
    findings.push({
      severity: 'warning',
      rule: 'USE_SECRETS_MANAGER',
      message:
        'No Secrets Manager. Database credentials may be stored insecurely in environment variables.',
      fix: 'Add aws.secrets_manager node connected from Lambda nodes to Aurora.',
    });
  }

  // WARNING: Philippine bank needs InstaPay
  if (isPhilippine && !hasLabel('instapay') && !hasLabel('bsp')) {
    findings.push({
      severity: 'warning',
      rule: 'PH_BANK_NEEDS_INSTAPAY',
      message: 'Philippine bank architecture missing BSP InstaPay integration.',
      fix: 'Add external.payment_network node for InstaPay Switch and external.system for BSP Reporting.',
    });
  }

  // INFO: CloudWatch recommended
  if (has('lambda') && !has('cloudwatch')) {
    findings.push({
      severity: 'info',
      rule: 'ADD_OBSERVABILITY',
      message: 'No CloudWatch logging configured for Lambda functions.',
      fix: 'Add aws.cloudwatch node connected from all Lambda nodes.',
    });
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 5);

  return {
    valid: criticalCount === 0,
    score,
    findings,
    criticalCount,
    warningCount,
  };
}
