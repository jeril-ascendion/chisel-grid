import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface NetworkStackOutputs {
  vpc: ec2.IVpc;
  privateSubnets: ec2.ISubnet[];
  publicSubnets: ec2.ISubnet[];
  lambdaSecurityGroup: ec2.SecurityGroup;
  auroraSecurityGroup: ec2.SecurityGroup;
  redisSecurityGroup: ec2.SecurityGroup;
}

export class NetworkStack extends Stack {
  public readonly outputs: NetworkStackOutputs;

  constructor(scope: Construct, id: string, config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    // VPC with public and private subnets across 2 AZs
    const vpc = new ec2.Vpc(this, 'ChiselGridVpc', {
      maxAzs: 2,
      natGateways: config.natGateways,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // VPC Endpoints (Gateway type — free)
    vpc.addGatewayEndpoint('S3Endpoint', { service: ec2.GatewayVpcEndpointAwsService.S3 });
    vpc.addGatewayEndpoint('DynamoDbEndpoint', { service: ec2.GatewayVpcEndpointAwsService.DYNAMODB });

    // VPC Endpoints (Interface type)
    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    vpc.addInterfaceEndpoint('BedrockEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
      privateDnsEnabled: true,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Security Groups
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSG', {
      vpc,
      securityGroupName: 'chiselgrid-lambda',
      description: 'Security group for ChiselGrid Lambda functions',
      allowAllOutbound: true,
    });

    const auroraSg = new ec2.SecurityGroup(this, 'AuroraSG', {
      vpc,
      securityGroupName: 'chiselgrid-aurora',
      description: 'Security group for ChiselGrid Aurora cluster',
      allowAllOutbound: false,
    });

    auroraSg.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSg.securityGroupId),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from Lambda',
    );

    const redisSg = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc,
      securityGroupName: 'chiselgrid-redis',
      description: 'Security group for ChiselGrid Redis (ElastiCache)',
      allowAllOutbound: false,
    });

    redisSg.addIngressRule(
      ec2.Peer.securityGroupId(lambdaSg.securityGroupId),
      ec2.Port.tcp(6379),
      'Allow Redis from Lambda',
    );

    // Outputs
    new CfnOutput(this, 'VpcId', { value: vpc.vpcId, exportName: `${id}-VpcId` });
    new CfnOutput(this, 'LambdaSgId', { value: lambdaSg.securityGroupId, exportName: `${id}-LambdaSgId` });
    new CfnOutput(this, 'AuroraSgId', { value: auroraSg.securityGroupId, exportName: `${id}-AuroraSgId` });

    this.outputs = {
      vpc,
      privateSubnets: vpc.privateSubnets,
      publicSubnets: vpc.publicSubnets,
      lambdaSecurityGroup: lambdaSg,
      auroraSecurityGroup: auroraSg,
      redisSecurityGroup: redisSg,
    };
  }
}
