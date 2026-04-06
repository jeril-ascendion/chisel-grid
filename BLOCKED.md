# ChiselGrid — Blocked Items

## BLOCKED: T-01.3 / T-01.4 / T-01.5 — CDK Deploy

**Blocker:** AWS credentials are not configured on this machine. `aws sts get-caller-identity` fails with `NoCredentials` error. The CDK synth produces valid CloudFormation templates but `cdk deploy` cannot execute without credentials.

**Needed from:** Developer (Jeril) — configure AWS CLI credentials via `aws configure` or `aws sso login`.

**Impact:** Cannot deploy Network, Data, or Storage stacks to AWS. All CDK code is written and validated via `cdk synth`.

**Workaround:** All CDK stacks are fully coded and synthesize to valid CloudFormation templates. The placeholder account ID `000000000000` in `cdk.json` must be replaced with the actual AWS account ID. Code can be committed and deployed later when credentials are available.

**Resumption steps:**
1. Run `aws configure` or `aws sso login` to set up credentials
2. Run `aws sts get-caller-identity --query Account --output text` to get account ID
3. Update account IDs in `infra/cdk.json` (replace `000000000000`)
4. Run `cdk bootstrap aws://ACCOUNT_ID/ap-southeast-1`
5. Run `pnpm cdk:deploy` or deploy individual stacks with `cd infra && npx cdk deploy ChiselGrid-Dev-Network --context env=dev`

## BLOCKED: Git Push

**Blocker:** GitHub HTTPS credentials not configured. `git push` fails with "could not read Username".

**Needed from:** Developer (Jeril) — configure GitHub authentication via SSH key or personal access token.

**Resumption steps:**
1. Set up SSH: `git remote set-url origin git@github.com:jeril-ascendion/chisel-grid.git`
2. Or configure HTTPS token: `gh auth login` (GitHub CLI)
3. Run `git push origin main`
