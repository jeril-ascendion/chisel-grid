---
name: serverless
version: 1.0.0
description: Serverless Lambda + API Gateway patterns. Loaded when prompt mentions Lambda or serverless.
domain: aws-serverless
---

In a serverless design, compute is Lambda and the entry point is API Gateway.
ALB and EC2 do not appear in serverless designs.

## Rules
- Serverless requirement → Lambda + API Gateway only. Never use EC2 or ALB in a serverless design.
- ALB is for containers and EC2. API Gateway IS the entry point for Lambda — do not chain ALB → Lambda.
- Cognito authentication happens AT API Gateway via JWT Authorizer, configured on the route.
- Cognito is NOT a downstream Lambda dependency. Lambdas do not call Cognito for auth.
- Long-running work belongs behind SQS or Step Functions, not in synchronous Lambda chains.

## Constraints
- No EC2 or ALB nodes in a serverless diagram unless the user explicitly requests a hybrid design.
- Do not draw an edge from a Lambda back into Cognito for authentication.

## Examples
- Correct: [API Gateway with Cognito Authorizer attached] → [Lambda]
- Wrong:   [API Gateway] → [Lambda] → [Cognito]
- Correct serverless write path: [API Gateway] → [Lambda] → [SQS] → [Worker Lambda] → [Aurora]
