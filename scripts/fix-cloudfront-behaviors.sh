#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# fix-cloudfront-behaviors.sh
#
# Emergency repair for CloudFront distribution EWLP3KOX3KKTV.
# Restores the 11 Lambda cache behaviors that /admin, /api, /login,
# /category, /articles, /search, /_next/data, /share depend on.
#
# Run this if the post-deploy smoke test reports /admin returning 200
# instead of 307, or if /admin loads unstyled (CSS missing, blue links).
# Safe to re-run — idempotent: existing behaviors are updated, missing
# ones are added, other behaviors (e.g. /media/*) are preserved.
#
# See CLAUDE.md rule: "CLOUDFRONT BEHAVIOR REGRESSION".
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-PowerUserAccess-852973339602}"
CF_DIST_ID="${CF_DIST_ID:-EWLP3KOX3KKTV}"
TMP_CURRENT="/tmp/cf_fix_current.json"
TMP_PATCHED="/tmp/cf_fix_patched.json"

echo "[fix-cf] Fetching current distribution config…"
aws cloudfront get-distribution-config --id "$CF_DIST_ID" \
  --profile "$AWS_PROFILE" \
  --region us-east-1 \
  --output json > "$TMP_CURRENT"

python3 << PYEOF
import json

with open("$TMP_CURRENT") as f:
    data = json.load(f)

cfg = data['DistributionConfig']

# Locate the API Gateway origin (must already exist — created by WebStack).
api_origin_id = None
for o in cfg['Origins']['Items']:
    if 'execute-api' in o['DomainName']:
        api_origin_id = o['Id']
        break

if not api_origin_id:
    raise SystemExit(
        "ERROR: No API Gateway origin found on distribution. "
        "WebStack must be deployed first so its HttpApi becomes a CloudFront origin."
    )

print(f"[fix-cf] API Gateway origin: {api_origin_id}")

# AWS managed policies (reused by existing Lambda behaviors on this dist).
CACHE_POLICY_DISABLED = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
ORIGIN_REQ_POLICY_ALL_VIEWER_EXCEPT_HOST = "b689b0a8-53d0-40ab-baf2-68738e2966ac"

def new_lambda_behavior(path):
    return {
        "PathPattern": path,
        "TargetOriginId": api_origin_id,
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["HEAD","DELETE","POST","GET","OPTIONS","PUT","PATCH"],
            "CachedMethods": {"Quantity": 2, "Items": ["HEAD","GET"]},
        },
        "Compress": True,
        "SmoothStreaming": False,
        "TrustedSigners": {"Enabled": False, "Quantity": 0},
        "TrustedKeyGroups": {"Enabled": False, "Quantity": 0},
        "LambdaFunctionAssociations": {"Quantity": 0},
        "FunctionAssociations": {"Quantity": 0},
        "FieldLevelEncryptionId": "",
        "CachePolicyId": CACHE_POLICY_DISABLED,
        "OriginRequestPolicyId": ORIGIN_REQ_POLICY_ALL_VIEWER_EXCEPT_HOST,
        "GrpcConfig": {"Enabled": False},
    }

# Exact paths that must point to Lambda. Order here becomes CloudFront order.
lambda_paths = [
    "/api/*", "/admin", "/admin/*",
    "/login", "/login/*",
    "/category/*", "/articles/*", "/search*",
    "/_next/data/*",
    "/share", "/share/*",
]

existing = cfg.get('CacheBehaviors', {}).get('Items', [])
by_pattern = {b['PathPattern']: b for b in existing}

changes = []
for path in lambda_paths:
    if path in by_pattern:
        b = by_pattern[path]
        if b['TargetOriginId'] != api_origin_id:
            b['TargetOriginId'] = api_origin_id
            changes.append(f"retargeted {path}")
    else:
        existing.append(new_lambda_behavior(path))
        changes.append(f"added {path}")

cfg['CacheBehaviors'] = {"Quantity": len(existing), "Items": existing}

with open("$TMP_PATCHED", 'w') as f:
    json.dump(cfg, f)

if not changes:
    print("[fix-cf] No changes needed — all 11 Lambda behaviors already correct.")
else:
    for c in changes:
        print(f"[fix-cf] {c}")

print(f"[fix-cf] Final behavior count: {len(existing)}")
for b in existing:
    print(f"  {b['PathPattern']:25s} -> {b['TargetOriginId']}")
PYEOF

# Short-circuit if nothing changed (avoid unnecessary distribution replacement).
if ! diff -q \
    <(python3 -c "import json; print(json.dumps(json.load(open('$TMP_CURRENT'))['DistributionConfig'], sort_keys=True))") \
    <(python3 -c "import json; print(json.dumps(json.load(open('$TMP_PATCHED')), sort_keys=True))") \
    > /dev/null; then
  ETAG=$(python3 -c "import json; print(json.load(open('$TMP_CURRENT'))['ETag'])")
  echo "[fix-cf] Applying update (ETag: $ETAG)…"
  aws cloudfront update-distribution \
    --id "$CF_DIST_ID" \
    --distribution-config "file://$TMP_PATCHED" \
    --if-match "$ETAG" \
    --profile "$AWS_PROFILE" \
    --region us-east-1 \
    --query "Distribution.Status" \
    --output text

  echo "[fix-cf] Creating cache invalidation…"
  aws cloudfront create-invalidation \
    --distribution-id "$CF_DIST_ID" \
    --paths "/*" \
    --profile "$AWS_PROFILE" \
    --region us-east-1 \
    --query "Invalidation.Status" \
    --output text

  echo "[fix-cf] Waiting for CloudFront to reach Deployed (up to 10 min)…"
  for i in $(seq 1 20); do
    sleep 30
    STATUS=$(aws cloudfront get-distribution --id "$CF_DIST_ID" \
      --query "Distribution.Status" --output text \
      --profile "$AWS_PROFILE" --region us-east-1)
    echo "  [$((i*30))s] $STATUS"
    [ "$STATUS" = "Deployed" ] && break
  done
else
  echo "[fix-cf] Config unchanged — skipping update."
fi

# Post-repair smoke test.
echo ""
echo "[fix-cf] Smoke test:"
HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chiselgrid.com)
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chiselgrid.com/login)
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chiselgrid.com/admin)
echo "  Homepage : $HOME_CODE  (expect 200)"
echo "  Login    : $LOGIN_CODE  (expect 200)"
echo "  Admin    : $ADMIN_CODE  (expect 307)"

if [ "$ADMIN_CODE" != "307" ] && [ "$ADMIN_CODE" != "302" ]; then
  echo ""
  echo "[fix-cf] WARNING: /admin returned $ADMIN_CODE — CloudFront routing still broken."
  echo "[fix-cf]          Check CDK stack infra/lib/stacks/storage.stack.ts."
  exit 1
fi

echo ""
echo "[fix-cf] DONE."
