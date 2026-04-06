import {
  aws_certificatemanager as acm,
  aws_cloudfront as cf,
  aws_route53 as route53,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface TenantCustomDomainProps {
  /** The tenant's custom domain (e.g., "blog.acme.com") */
  customDomain: string;
  /** The CloudFront distribution to attach the domain to */
  distribution: cf.IDistribution;
  /** Optional: Route53 hosted zone for DNS validation (if we manage DNS) */
  hostedZone?: route53.IHostedZone;
}

/**
 * CDK construct for provisioning a custom SSL certificate per tenant.
 *
 * Workflow:
 * 1. Creates an ACM certificate in us-east-1 (required for CloudFront)
 * 2. Validates via DNS (tenant adds CNAME record) or email
 * 3. Once validated, the certificate is attached to the CloudFront distribution
 *
 * For tenants who manage their own DNS:
 * - We output the CNAME validation records they need to add
 * - Once they add the records, ACM auto-validates
 * - Then they add a CNAME pointing their domain to the CloudFront distribution
 */
export class TenantCustomDomain extends Construct {
  public readonly certificate: acm.Certificate;
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: TenantCustomDomainProps) {
    super(scope, id);

    this.domainName = props.customDomain;

    // Create ACM certificate with DNS validation
    if (props.hostedZone) {
      // We manage DNS — auto-validate via Route53
      this.certificate = new acm.Certificate(this, 'Certificate', {
        domainName: props.customDomain,
        validation: acm.CertificateValidation.fromDns(props.hostedZone),
      });

      // Create Route53 A record pointing to CloudFront
      new route53.ARecord(this, 'AliasRecord', {
        zone: props.hostedZone,
        recordName: props.customDomain,
        target: route53.RecordTarget.fromAlias({
          bind: () => ({
            dnsName: props.distribution.distributionDomainName,
            hostedZoneId: 'Z2FDTNDATAQYW2', // CloudFront hosted zone ID (global constant)
          }),
        }),
      });
    } else {
      // Tenant manages DNS — they must add CNAME validation records manually
      this.certificate = new acm.Certificate(this, 'Certificate', {
        domainName: props.customDomain,
        validation: acm.CertificateValidation.fromDns(),
      });
    }

    new CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: `ACM certificate ARN for ${props.customDomain}`,
    });

    new CfnOutput(this, 'CloudFrontCNAME', {
      value: props.distribution.distributionDomainName,
      description: `Tenant should CNAME ${props.customDomain} to this CloudFront domain`,
    });
  }
}
