# ChiselGrid — AWS Infrastructure Guide

## Quick Reference

| Action | Command |
|--------|---------|
| Start Aurora | bash scripts/start-dev.sh |
| Stop Aurora | bash scripts/stop-dev.sh |
| Re-enable chiselgrid.com | See Re-enabling CloudFront section below |
| Deploy frontend | bash scripts/chiselgrid-aws.sh deploy |
| Deploy infra via CDK | cd infra && npx cdk deploy ChiselGrid-Dev-Web --profile PowerUserAccess-852973339602 --region ap-southeast-1 --require-approval never |

---

## AWS Account and Region

| Item | Value |
|------|-------|
| Account | 852973339602 |
| Primary region | ap-southeast-1 Singapore |
| ACM cert region | us-east-1 CloudFront requirement |
| AWS profile | PowerUserAccess-852973339602 |

---

## Resource Inventory and Cost

| Resource | Identifier | Cost stopped | Cost active | Notes |
|----------|-----------|--------------|-------------|-------|
| Aurora Serverless v2 | chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn | $0/hr | $0.12/hr | Stop after every session |
| CloudFront S3 dist | EWLP3KOX3KKTV | $0 | $0.01/10k req | Serves chiselgrid.com UI |
| CloudFront Lambda dist | E23TR00XJJCH02 | $0 | $0.01/10k req | Serves /api/* via API Gateway |
| Lambda | chiselgrid-Dev-nextjs-server | $0 | $0.0000002/req | Pay per invocation only |
| API Gateway | ux71c274nd.execute-api.ap-southeast-1.amazonaws.com | $0 | $1/million req | HTTP API v2 |
| S3 bucket | chiselgrid-frontend-dev-storage | $0.02/month | $0.02/month | Storage only |
| Cognito | ap-southeast-1_udIDE5cgD | $0 | $0 | Under free tier |
| Secrets Manager | aurora-master-credentials | $0.40/month | $0.40/month | 4 secrets |
| CloudWatch | Various log groups | $0.50/month | $0.50/month | Lambda and API Gateway logs |

Monthly cost at rest with Aurora stopped: approximately $1 per month
Monthly cost active with Aurora running 8 hours per day: approximately $20 per month

---

## Starting Resources for a Dev Session

Step 1 — Start Aurora

    bash scripts/start-dev.sh

Verify Aurora is available:

    aws rds describe-db-clusters --db-cluster-identifier chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn --query "DBClusters[0].Status" --output text --profile PowerUserAccess-852973339602 --region ap-southeast-1

Expected output: available

Step 2 — Re-enable CloudFront only if previously disabled

    aws cloudfront get-distribution-config --id EWLP3KOX3KKTV --profile PowerUserAccess-852973339602 --region us-east-1 --output json > /tmp/cf.json && python3 -c "import json; d=json.load(open('/tmp/cf.json')); d['DistributionConfig']['Enabled']=True; open('/tmp/cf_on.json','w').write(json.dumps(d['DistributionConfig']))" && aws cloudfront update-distribution --id EWLP3KOX3KKTV --if-match $(python3 -c "import json; print(json.load(open('/tmp/cf.json'))['ETag'])") --distribution-config file:///tmp/cf_on.json --profile PowerUserAccess-852973339602 --region us-east-1 --query "Distribution.Status" --output text

Verify deployment complete — wait 3 to 5 minutes then run:

    aws cloudfront get-distribution --id EWLP3KOX3KKTV --query "Distribution.Status" --profile PowerUserAccess-852973339602 --region us-east-1 --output text

Expected output: Deployed

---

## Stopping Resources After a Session

Step 1 — Stop Aurora

    bash scripts/stop-dev.sh

Verify Aurora is stopped:

    aws rds describe-db-clusters --db-cluster-identifier chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn --query "DBClusters[0].Status" --output text --profile PowerUserAccess-852973339602 --region ap-southeast-1

Expected output: stopped

Step 2 — Disable CloudFront only for shutdowns of a week or more

    aws cloudfront get-distribution-config --id EWLP3KOX3KKTV --profile PowerUserAccess-852973339602 --region us-east-1 --output json > /tmp/cf.json && python3 -c "import json; d=json.load(open('/tmp/cf.json')); d['DistributionConfig']['Enabled']=False; open('/tmp/cf_off.json','w').write(json.dumps(d['DistributionConfig']))" && aws cloudfront update-distribution --id EWLP3KOX3KKTV --if-match $(python3 -c "import json; print(json.load(open('/tmp/cf.json'))['ETag'])") --distribution-config file:///tmp/cf_off.json --profile PowerUserAccess-852973339602 --region us-east-1 --query "Distribution.Status" --output text

WARNING: Disabling EWLP3KOX3KKTV while it is the active Route53 ALIAS target causes DNS_PROBE_FINISHED_NXDOMAIN in all browsers. Always re-enable and wait for Deployed status before testing. Documented in CLAUDE.md under CRITICAL PERMANENT RULES.

---

## DNS and CloudFront Architecture

Browser connects to chiselgrid.com or www.chiselgrid.com
Route53 ALIAS points to EWLP3KOX3KKTV which is the S3 CloudFront distribution
All requests to /* are served from the S3 bucket containing UI assets
All requests to /api/* are proxied to API Gateway then to Lambda then to Aurora

| Domain | Distribution | Serves |
|--------|-------------|--------|
| chiselgrid.com | EWLP3KOX3KKTV | Full site |
| www.chiselgrid.com | EWLP3KOX3KKTV | Full site |
| d1f3r42tp7znsx.cloudfront.net | EWLP3KOX3KKTV | Direct bypass DNS |
| d3vj1ld2tuncka.cloudfront.net | E23TR00XJJCH02 | Lambda API only |

---

## Aurora Database Reference

| Item | Value |
|------|-------|
| Cluster identifier | chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn |
| Engine | Aurora PostgreSQL 15 |
| Database name | chiselgrid |
| Access method | RDS Data API |
| Credentials secret | chiselgrid/ChiselGrid-Dev-Data/aurora-master-credentials |
| Tenant ID | ascendion |

Set ARN environment variables before running Aurora queries:

    export CLUSTER_ARN=$(aws rds describe-db-clusters --db-cluster-identifier chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn --query "DBClusters[0].DBClusterArn" --output text --profile PowerUserAccess-852973339602 --region ap-southeast-1) && export SECRET_ARN=$(aws secretsmanager describe-secret --secret-id chiselgrid/ChiselGrid-Dev-Data/aurora-master-credentials --query "ARN" --output text --profile PowerUserAccess-852973339602 --region ap-southeast-1) && echo "CLUSTER_ARN=$CLUSTER_ARN" && echo "SECRET_ARN=$SECRET_ARN"

Check article counts by status:

    aws rds-data execute-statement --resource-arn "$CLUSTER_ARN" --secret-arn "$SECRET_ARN" --database chiselgrid --sql "SELECT status, COUNT(*) FROM content WHERE tenant_id='ascendion' GROUP BY status" --profile PowerUserAccess-852973339602 --region ap-southeast-1 --output json

---

## Lambda Environment Variables

| Variable | Purpose |
|----------|---------|
| AURORA_CLUSTER_ARN | RDS cluster ARN |
| AURORA_SECRET_ARN | Secrets Manager ARN |
| AURORA_DATABASE | chiselgrid |
| NEXTAUTH_SECRET | Auth signing secret |
| NEXTAUTH_URL | https://www.chiselgrid.com |
| COGNITO_CLIENT_ID | Cognito app client |
| COGNITO_USER_POOL_ID | ap-southeast-1_udIDE5cgD |

Check all current Lambda env vars:

    aws lambda get-function-configuration --function-name chiselgrid-Dev-nextjs-server --query "Environment.Variables" --profile PowerUserAccess-852973339602 --region ap-southeast-1 --output json

---

## Deployment Commands

Deploy frontend assets to S3 and invalidate CloudFront:

    bash scripts/chiselgrid-aws.sh deploy

Deploy infrastructure changes via CDK:

    cd infra && npx cdk deploy ChiselGrid-Dev-Web --profile PowerUserAccess-852973339602 --region ap-southeast-1 --require-approval never && cd ..

Full OpenNext rebuild and CDK deploy:

    cd apps/web && npx open-next@latest build && cd ../../infra && npx cdk deploy ChiselGrid-Dev-Web --profile PowerUserAccess-852973339602 --region ap-southeast-1 --require-approval never && cd ..

Invalidate CloudFront cache:

    aws cloudfront create-invalidation --distribution-id EWLP3KOX3KKTV --paths "/*" --profile PowerUserAccess-852973339602 --region us-east-1 --output json

---

## Cost Optimisation Rules

1. Always stop Aurora after every session. It is the only resource with significant idle cost.
2. Never leave Aurora running overnight. 8 idle hours costs approximately $1. A week costs approximately $7.
3. Lambda, API Gateway, and CloudFront cost zero at zero traffic. No action needed between sessions.
4. S3 storage is negligible. No action needed.
5. Only disable CloudFront for shutdowns of a week or more. Re-enabling takes 3 to 5 minutes and carries NXDOMAIN risk if forgotten.

---

Last updated: April 2026
