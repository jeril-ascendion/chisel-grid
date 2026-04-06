import { Stack, type StackProps, Tags } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, _config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');
    // Cognito User Pool and Identity Pool added in EPIC-02
  }
}
