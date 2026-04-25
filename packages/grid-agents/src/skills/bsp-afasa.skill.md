---
name: bsp-afasa
version: 1.0.0
description: Philippine banking — Bangko Sentral ng Pilipinas, AFASA, InstaPay requirements.
domain: financial-philippines
---

For Philippine banks (Union Bank, BDO, BPI, Metrobank, Land Bank, RCBC, Security Bank,
PNB, China Bank) and any Philippine fintech, BSP and AFASA controls apply.

## Rules
- Add an external.payment_network node labelled "InstaPay Switch" for retail electronic fund transfers.
- Add an external.system node labelled "BSP Reporting" for regulatory submissions.
- Annotate the Aurora node with region: "ap-southeast-1" — Philippine customer data must remain in-country.
- Cross-border edges carrying customer data are forbidden by BSP residency rules; flag them as compliance findings.
- Maintain a separate audit log stream for BSP compliance, fed by CloudTrail and CloudWatch.

## Constraints
- Do not route Philippine customer data through us-east-1 or any non-ap-southeast-1 region.
- Do not omit the InstaPay or BSP Reporting external systems for retail bank flows.

## Examples
- A Union Bank payment system always includes [InstaPay Switch] and [BSP Reporting] as external systems on the right side of the diagram.
- AFASA requires fraud monitoring — Cognito Advanced Security or an equivalent fraud-scoring Lambda should be present.
