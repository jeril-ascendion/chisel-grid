---
name: positions
version: 1.0.0
description: Node position guidelines for a readable left-to-right architecture layout.
domain: layout
---

Position nodes for a readable left-to-right flow: external actors on the left,
edge/CDN next, application tier in the middle, data tier on the right,
external systems on the far right. Observability sits at the bottom.

## Rules
- External user / customer: x:50, y:400
- WAF: x:200, y:300
- CloudFront: x:380, y:300
- API Gateway: x:560, y:300
- Cognito: x:560, y:100
- Auth Lambda: x:750, y:150
- Payment API Lambda: x:750, y:300
- Document Handler Lambda: x:750, y:500
- SQS Payment Queue: x:960, y:250
- Payment Processor Lambda: x:960, y:350
- Aurora Primary: x:1180, y:250
- Aurora Replica: x:1180, y:370
- Secrets Manager: x:1180, y:490
- KMS: x:1180, y:610
- S3 Document Storage: x:960, y:550
- CloudWatch: x:960, y:680
- CloudTrail: x:1180, y:730
- InstaPay Switch: x:1400, y:300
- BSP Reporting: x:1400, y:450

## Constraints
- Every node must have a numeric position.x and position.y.
- Two nodes should not share identical x and y coordinates — offset by at least 50 if conflict.

## Examples
- A node positioned mid-canvas: { "id": "payment-api", "position": { "x": 750, "y": 300 } }
