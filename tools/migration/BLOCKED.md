# Taxonomy Import — Blocked on VPC Access

## Status
The migration scripts are **complete and tested** (dry-run passes for all 155 articles).
Aurora is running but not accessible from the local dev machine (it's inside a VPC with no public endpoint).

## To Run the Import

### Option 1: From a bastion host / EC2 instance inside the VPC
```bash
# SSH into bastion
ssh bastion

# Clone and set up
cd ~/projects/chisel-grid
export DATABASE_URL="postgresql://chiselgrid_admin:<password>@chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn.cluster-c946ag2qstlg.ap-southeast-1.rds.amazonaws.com:5432/chiselgrid"

# Step 1: Seed categories
pnpm --filter @chiselgrid/migration exec tsx src/seed-categories.ts

# Step 2: Import articles (with AI enhancement via Bedrock)
pnpm --filter @chiselgrid/migration exec tsx src/import-taxonomy.ts

# Step 3: Verify
pnpm --filter @chiselgrid/migration exec tsx src/verify-import.ts
```

### Option 2: Add a public endpoint temporarily
```bash
# Or use SSM port forwarding
aws ssm start-session --target <bastion-instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn.cluster-c946ag2qstlg.ap-southeast-1.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["5432"]}' \
  --profile PowerUserAccess-852973339602 --region ap-southeast-1
```

### Option 3: Skip AI, import with fallback content
```bash
export DATABASE_URL="..."
pnpm --filter @chiselgrid/migration exec tsx src/import-taxonomy.ts --skip-ai
```

## DB Password
Retrieve from Secrets Manager:
```bash
aws secretsmanager get-secret-value \
  --secret-id "chiselgrid/ChiselGrid-Dev-Data/aurora-master-credentials" \
  --profile PowerUserAccess-852973339602 --region ap-southeast-1
```
