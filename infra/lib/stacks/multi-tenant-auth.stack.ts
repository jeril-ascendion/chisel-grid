import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  aws_dynamodb as dynamodb,
  RemovalPolicy,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';
import { TenantUserPool } from '../constructs/tenant-user-pool';

export interface TenantConfig {
  tenantName: string;
  subdomain: string;
}

export interface MultiTenantAuthStackOutputs {
  tenantPoolsTable: dynamodb.Table;
  tenantPools: Map<string, TenantUserPool>;
}

/**
 * Multi-tenant authentication stack.
 * Creates:
 * 1. A DynamoDB table mapping tenant subdomains to Cognito User Pool IDs
 * 2. Per-tenant Cognito User Pools (provisioned via CDK context or runtime API)
 *
 * Tenant pool metadata is stored in DynamoDB for runtime resolution by Lambda@Edge.
 */
export class MultiTenantAuthStack extends Stack {
  public readonly outputs: MultiTenantAuthStackOutputs;

  constructor(scope: Construct, id: string, config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    // DynamoDB table for tenant → Cognito pool mapping
    // Used by Lambda@Edge at runtime to resolve tenant from hostname
    const tenantPoolsTable = new dynamodb.Table(this, 'TenantPoolsTable', {
      tableName: `chiselgrid-tenant-pools-${config.enableDeletion ? 'dev' : 'prod'}`,
      partitionKey: { name: 'subdomain', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: !config.enableDeletion },
    });

    // GSI for looking up by custom domain
    tenantPoolsTable.addGlobalSecondaryIndex({
      indexName: 'customDomain-index',
      partitionKey: { name: 'customDomain', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for looking up by tenantId
    tenantPoolsTable.addGlobalSecondaryIndex({
      indexName: 'tenantId-index',
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Provision test tenants from CDK context (for dev/staging)
    const testTenants = (this.node.tryGetContext('testTenants') as TenantConfig[] | undefined) || [];
    const tenantPools = new Map<string, TenantUserPool>();

    for (const tenant of testTenants) {
      const pool = new TenantUserPool(this, `Tenant-${tenant.subdomain}`, {
        tenantName: tenant.tenantName,
        tenantSubdomain: tenant.subdomain,
        callbackDomain: config.domain,
        enableDeletion: config.enableDeletion,
      });
      tenantPools.set(tenant.subdomain, pool);

      new CfnOutput(this, `TenantPoolId-${tenant.subdomain}`, {
        value: pool.userPoolId,
        exportName: `${id}-TenantPoolId-${tenant.subdomain}`,
      });
      new CfnOutput(this, `TenantPoolClientId-${tenant.subdomain}`, {
        value: pool.userPoolClientId,
        exportName: `${id}-TenantPoolClientId-${tenant.subdomain}`,
      });
    }

    // Outputs
    new CfnOutput(this, 'TenantPoolsTableName', {
      value: tenantPoolsTable.tableName,
      exportName: `${id}-TenantPoolsTableName`,
    });
    new CfnOutput(this, 'TenantPoolsTableArn', {
      value: tenantPoolsTable.tableArn,
      exportName: `${id}-TenantPoolsTableArn`,
    });

    this.outputs = {
      tenantPoolsTable,
      tenantPools,
    };
  }
}
