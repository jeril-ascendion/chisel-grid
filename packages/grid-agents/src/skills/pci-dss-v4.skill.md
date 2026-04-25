---
name: pci-dss-v4
version: 1.0.0
description: PCI-DSS v4.0 cardholder data zone, scope minimisation, and encryption rules.
domain: compliance-pci
---

PCI-DSS v4.0 governs the Cardholder Data Environment (CDE). The CDE is a zone
in Grid-IR called "compliance" or labelled "PCI-DSS Zone 1". Scope must be minimised.

## Rules
- The PCI-DSS zone contains ONLY: Payment Processor Lambda, Aurora Payments Database (primary + replica), and Secrets Manager for payment credentials.
- The PCI-DSS zone must NOT contain: CloudFront, WAF, API Gateway, Document Handler Lambdas, S3 document storage, or any non-payment component.
- All data at rest in the CDE is encrypted with KMS customer-managed keys (req 3.4, 3.5).
- All data in transit between CDE components uses TLS 1.2 or higher (req 4.1).
- Secrets Manager rotates credentials automatically (req 8.3.6).
- CloudTrail logs all CDE API activity to an immutable destination (req 10).

## Constraints
- Do not widen the PCI scope to include components that do not touch cardholder data.
- Do not store unencrypted cardholder data anywhere — including logs, metrics, or DLQs.
- Do not allow direct internet access to any CDE component. Ingress goes through API Gateway → Lambda → SQS only.

## Examples
- Correct CDE: { Payment Processor Lambda, Aurora Multi-AZ PCI, Secrets Manager } inside the compliance zone.
- Wrong CDE: includes CloudFront, WAF, or Document Handler Lambda — all of which sit outside the PCI scope.
