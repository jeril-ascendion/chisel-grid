import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  RemovalPolicy,
  Duration,
  aws_rds as rds,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';
import type { NetworkStack } from './network.stack';

export interface DataStackOutputs {
  clusterEndpoint: string;
  dbSecretArn: string;
  dbPort: number;
}

export class DataStack extends Stack {
  public readonly outputs: DataStackOutputs;

  constructor(
    scope: Construct,
    id: string,
    networkStack: NetworkStack,
    config: EnvConfig,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const { vpc, privateSubnets, auroraSecurityGroup } = networkStack.outputs;

    // Subnet group for Aurora — private subnets only
    const subnetGroup = new rds.SubnetGroup(this, 'AuroraSubnetGroup', {
      vpc,
      description: 'ChiselGrid Aurora private subnet group',
      vpcSubnets: { subnets: privateSubnets },
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // Aurora Serverless v2 Cluster — PostgreSQL 15
    const cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        scaleWithWriter: true,
      }),
      serverlessV2MinCapacity: config.auroraMinAcu,
      serverlessV2MaxCapacity: config.auroraMaxAcu,
      vpc,
      vpcSubnets: { subnets: privateSubnets },
      securityGroups: [auroraSecurityGroup],
      subnetGroup,
      defaultDatabaseName: 'chiselgrid',
      credentials: rds.Credentials.fromGeneratedSecret('chiselgrid_admin', {
        secretName: `chiselgrid/${id}/aurora-master-credentials`,
      }),
      backup: {
        retention: Duration.days(config.enableDeletion ? 1 : 7),
        preferredWindow: '02:00-03:00',
      },
      preferredMaintenanceWindow: 'Sun:03:00-Sun:04:00',
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      deletionProtection: !config.enableDeletion,
      iamAuthentication: true,
    });

    // Suppress lint for unused variable
    void ec2;

    const secret = cluster.secret!;

    // Outputs
    new CfnOutput(this, 'ClusterEndpoint', {
      value: cluster.clusterEndpoint.hostname,
      exportName: `${id}-ClusterEndpoint`,
    });
    new CfnOutput(this, 'DbSecretArn', {
      value: secret.secretArn,
      exportName: `${id}-DbSecretArn`,
    });
    new CfnOutput(this, 'DbPort', {
      value: cluster.clusterEndpoint.port.toString(),
      exportName: `${id}-DbPort`,
    });

    this.outputs = {
      clusterEndpoint: cluster.clusterEndpoint.hostname,
      dbSecretArn: secret.secretArn,
      dbPort: cluster.clusterEndpoint.port,
    };
  }
}
