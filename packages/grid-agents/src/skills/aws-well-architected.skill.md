---
name: aws-well-architected
version: 1.0.0
description: AWS Well-Architected Framework — six pillars and service correctness rules.
domain: aws
---

Apply the AWS Well-Architected Framework. Six pillars: Operational Excellence,
Security, Reliability, Performance Efficiency, Cost Optimisation, Sustainability.

## Rules
- Aurora must be Multi-AZ for production financial or transactional workloads. Single instance is unacceptable.
- Every Lambda accessing RDS, Aurora, or ElastiCache lives in a VPC private subnet.
- NAT Gateway sits in a public subnet only.
- Out of VPC by design: API Gateway, CloudFront, Cognito, SQS, SNS, S3, KMS, Secrets Manager, WAF.
- Database credentials live in AWS Secrets Manager, never in environment variables on the Lambda.
- Encryption-at-rest required: KMS keys for Aurora and S3.
- Audit logging required: CloudTrail for all API calls, CloudWatch for operational logs.
- Avoid synchronous Lambda chains. Decouple long-running steps with SQS or Step Functions.

## Constraints
- Do not invent AWS services that are not part of the public catalog.
- Do not place CloudFront, API Gateway, or Cognito inside a VPC.
- Do not omit observability for production systems — at minimum CloudWatch must be present.

## Examples
- Valid node types: aws.waf, aws.cloudfront, aws.api_gateway, aws.lambda, aws.cognito, aws.aurora, aws.s3, aws.sqs, aws.sns, aws.kms, aws.secrets_manager, aws.cloudwatch, aws.cloudtrail, aws.nat_gateway, aws.vpc, aws.elasticache, aws.dynamodb, aws.step_functions, aws.eventbridge.
- External actor types: external.user, external.system, external.payment_network.
