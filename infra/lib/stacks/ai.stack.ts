import { Stack, type StackProps, Tags } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export class AiStack extends Stack {
  constructor(scope: Construct, id: string, _config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');
    // Bedrock, Step Functions, SQS resources added in EPIC-04
  }
}
