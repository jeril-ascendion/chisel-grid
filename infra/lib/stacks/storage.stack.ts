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
  aws_certificatemanager as acm,
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

    // CloudFront distribution with OAC for both buckets + Lambda (API Gateway)
    // origin for dynamic Next.js routes.
    //
    // CRITICAL — The paths in `additionalBehaviors` below are the contract
    // between CloudFront and the Next.js Lambda. This has regressed 4+ times
    // when behaviors were managed manually in the AWS console. Every path
    // here MUST remain pinned to the API Gateway origin. See CLAUDE.md rule:
    // "CLOUDFRONT BEHAVIOR REGRESSION".
    //
    // The API Gateway domain is hardcoded because it lives in `WebStack`
    // (ChiselGrid-Dev-Web / NextjsHttpApiC1301D2C). Cross-stack reference is
    // avoided to keep this stack deployable independently of WebStack.
    // If the API Gateway ID ever changes, update `apiGatewayDomain` below
    // AND rerun the post-deploy smoke test in scripts/chiselgrid-aws.sh.
    const apiGatewayDomain = `ux71c274nd.execute-api.${config.region}.amazonaws.com`;
    const apiOrigin = new origins.HttpOrigin(apiGatewayDomain, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
    });

    const lambdaBehavior: cf.BehaviorOptions = {
      origin: apiOrigin,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      cachePolicy: cf.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      compress: true,
    };

    // Public domain + TLS cert for chiselgrid.com.
    // CRITICAL — ARN is pinned because the cert is in us-east-1 (CloudFront
    // requirement) and is not managed by CDK. If this block is removed, the
    // distribution falls back to *.cloudfront.net default cert and any request
    // for chiselgrid.com fails with NET::ERR_CERT_COMMON_NAME_INVALID — the
    // entire site goes down. See CLAUDE.md "VIEWER CERT REGRESSION".
    const chiselgridCert = acm.Certificate.fromCertificateArn(
      this,
      'ChiselgridCert',
      'arn:aws:acm:us-east-1:852973339602:certificate/0677b964-22bc-4db1-93c5-cb7e63ca7c4e',
    );

    const distribution = new cf.Distribution(this, 'WebDistribution', {
      comment: `ChiselGrid Web Distribution — ${id}`,
      domainNames: ['chiselgrid.com', 'www.chiselgrid.com'],
      certificate: chiselgridCert,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        // Lambda-served dynamic routes — MUST stay pinned to API Gateway.
        '/api/*':        lambdaBehavior,
        '/admin':        lambdaBehavior,
        '/admin/*':      lambdaBehavior,
        '/login':        lambdaBehavior,
        '/login/*':      lambdaBehavior,
        '/category/*':   lambdaBehavior,
        '/articles/*':   lambdaBehavior,
        '/search*':      lambdaBehavior,
        '/_next/data/*': lambdaBehavior,
        '/share':        lambdaBehavior,
        '/share/*':      lambdaBehavior,
        // Media bucket (separate S3 origin).
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
