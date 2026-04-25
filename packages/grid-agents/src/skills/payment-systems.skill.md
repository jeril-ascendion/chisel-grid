---
name: payment-systems
version: 1.0.0
description: Payment, financial, and banking system requirements. Async processing and PCI scope.
domain: financial
---

For payment, financial, banking, or fintech systems, additional architectural
controls are mandatory because money movement and cardholder data are involved.

## Rules
- aws.waf must front CloudFront for any internet-facing payment endpoint. Required for PCI-DSS.
- aws.sqs with a dead-letter queue is required for async payment processing and retry safety.
- aws.kms is required for Aurora and S3 encryption keys (PCI-DSS req 3.4).
- aws.cloudtrail is required for audit logging of all API calls (PCI-DSS requirement).
- aws.cloudwatch is required for operational logging.
- aws.secrets_manager holds database and partner credentials. Never use environment variables for these.
- Aurora must be Multi-AZ — a single instance is unacceptable for financial data.
- Payment processing Lambdas are async by default. The HTTP path enqueues to SQS and returns 202.

## Constraints
- Do not place a payment processor Lambda directly behind a synchronous public endpoint without a queue.
- Do not store any cardholder data outside the PCI-DSS zone.
- Do not skip the DLQ on the payment SQS queue.

## Examples
- Correct serverless payment flow: [WAF] → [CloudFront] → [API Gateway + Cognito JWT Authorizer] → [Payment API Lambda] → [SQS Payment Queue] → [Payment Processor Lambda PCI] → [Aurora Multi-AZ PCI] / [Secrets Manager] / [InstaPay External]; in parallel [Document Handler Lambda] → [S3 Encrypted].
- Observability: CloudWatch ← all Lambdas, CloudTrail ← all API calls.
