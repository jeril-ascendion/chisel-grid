import { Stack, type StackProps, Tags } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';
import type { NetworkStack } from './network.stack';
import type { DataStack } from './data.stack';

export class ApiStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    _networkStack: NetworkStack,
    _dataStack: DataStack,
    _config: EnvConfig,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');
    // API Gateway and Lambda handlers added in EPIC-02+
  }
}
