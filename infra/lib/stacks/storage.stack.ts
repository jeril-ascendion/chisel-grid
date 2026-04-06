import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  RemovalPolicy,
  Duration,
  aws_s3 as s3,
  aws_cloudfront as cf,
  aws_cloudfront_origins as origins,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface StorageStackOutputs {
  mediaBucket: s3.IBucket;
  mediaDistributionDomain: string;
}

export class StorageStack extends Stack {
  public readonly outputs: StorageStackOutputs;

  constructor(scope: Construct, id: string, config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const bucketSuffix = id.toLowerCase().replace(/chiselgrid-/g, '');

    // S3 — Media bucket (private, versioned)
    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `chiselgrid-media-${bucketSuffix}`,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{
        id: 'DeleteOldVersions',
        noncurrentVersionExpiration: Duration.days(30),
        abortIncompleteMultipartUploadAfter: Duration.days(7),
      }],
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: config.enableDeletion,
    });

    // S3 — Frontend bucket (private, served via CloudFront OAC)
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `chiselgrid-frontend-${bucketSuffix}`,
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: config.enableDeletion,
    });

    // CloudFront distribution with OAC for both buckets
    const distribution = new cf.Distribution(this, 'WebDistribution', {
      comment: `ChiselGrid Web Distribution — ${id}`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        '/media/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(mediaBucket),
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
      minimumProtocolVersion: cf.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Outputs
    new CfnOutput(this, 'MediaBucketName', { value: mediaBucket.bucketName, exportName: `${id}-MediaBucketName` });
    new CfnOutput(this, 'FrontendBucketName', { value: frontendBucket.bucketName, exportName: `${id}-FrontendBucketName` });
    new CfnOutput(this, 'DistributionDomainName', { value: distribution.distributionDomainName, exportName: `${id}-DistributionDomain` });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId, exportName: `${id}-DistributionId` });

    this.outputs = {
      mediaBucket,
      mediaDistributionDomain: distribution.distributionDomainName,
    };
  }
}
