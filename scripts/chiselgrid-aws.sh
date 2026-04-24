#!/bin/bash
AWS_PROFILE=${AWS_PROFILE:-PowerUserAccess-852973339602}
AWS_REGION=${AWS_REGION:-ap-southeast-1}
CF_DIST_ID="EWLP3KOX3KKTV"
S3_BUCKET="chiselgrid-frontend-dev-storage"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[ChiselGrid]${NC} $1"; }
ok()  { echo -e "${GREEN}✅${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠️${NC}  $1"; }

turn_on() {
  log "Starting Aurora..."
  CLUSTER=$(aws rds describe-db-clusters \
    --filters "Name=tag:Project,Values=ChiselGrid" \
    --query "DBClusters[0].DBClusterIdentifier" \
    --output text --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null)
  if [ -n "$CLUSTER" ] && [ "$CLUSTER" != "None" ]; then
    STATUS=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER" \
      --query "DBClusters[0].Status" --output text \
      --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null)
    if [ "$STATUS" = "stopped" ]; then
      aws rds start-db-cluster --db-cluster-identifier "$CLUSTER" \
        --profile $AWS_PROFILE --region $AWS_REGION > /dev/null
      ok "Aurora starting: $CLUSTER (takes 3-5 min)"
    elif [ "$STATUS" = "available" ]; then
      ok "Aurora already running"
    else
      warn "Aurora status: $STATUS"
    fi
  else
    ok "Aurora Serverless v2 — auto-starts on connection"
  fi
  ok "Lambda, Step Functions, Bedrock: always ready"
  echo ""
  echo "Run: bash scripts/chiselgrid-aws.sh wait"
  echo "Then: bash scripts/chiselgrid-aws.sh deploy"
}

turn_off() {
  log "Stopping Aurora to save costs..."
  CLUSTER=$(aws rds describe-db-clusters \
    --filters "Name=tag:Project,Values=ChiselGrid" \
    --query "DBClusters[0].DBClusterIdentifier" \
    --output text --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null)
  if [ -n "$CLUSTER" ] && [ "$CLUSTER" != "None" ]; then
    STATUS=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER" \
      --query "DBClusters[0].Status" --output text \
      --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null)
    if [ "$STATUS" = "available" ]; then
      aws rds stop-db-cluster --db-cluster-identifier "$CLUSTER" \
        --profile $AWS_PROFILE --region $AWS_REGION > /dev/null
      ok "Aurora stopping — saves ~\$50/month"
    else
      warn "Aurora status: $STATUS"
    fi
  fi
  ok "Estimated stopped cost: ~\$5-8/month (S3 + CloudFront only)"
}

wait_aurora() {
  log "Waiting for Aurora..."
  CLUSTER=$(aws rds describe-db-clusters \
    --filters "Name=tag:Project,Values=ChiselGrid" \
    --query "DBClusters[0].DBClusterIdentifier" \
    --output text --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null)
  if [ -z "$CLUSTER" ] || [ "$CLUSTER" = "None" ]; then
    ok "Aurora Serverless v2 — no wait needed"; return
  fi
  for i in $(seq 1 20); do
    STATUS=$(aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER" \
      --query "DBClusters[0].Status" --output text \
      --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null)
    if [ "$STATUS" = "available" ]; then ok "Aurora ready!"; return; fi
    echo "  Aurora: $STATUS — waiting ($i/20)..."
    sleep 15
  done
  warn "Aurora still starting. Check AWS Console."
}

show_status() {
  echo ""; echo "══ ChiselGrid Status ══════════════════"
  CLUSTER=$(aws rds describe-db-clusters \
    --filters "Name=tag:Project,Values=ChiselGrid" \
    --query "DBClusters[0].Status" \
    --output text --profile $AWS_PROFILE --region $AWS_REGION 2>/dev/null || echo "unknown")
  [ "$CLUSTER" = "available" ] && ok "Aurora: RUNNING" || warn "Aurora: $CLUSTER"
  CF=$(aws cloudfront get-distribution --id $CF_DIST_ID \
    --query "Distribution.Status" --output text \
    --profile $AWS_PROFILE --region us-east-1 2>/dev/null || echo "unknown")
  [ "$CF" = "Deployed" ] && ok "CloudFront: ACTIVE" || warn "CloudFront: $CF"
  ok "Lambda / Step Functions / Bedrock: serverless (always ready)"
  echo "══ Cost Estimate ══════════════════════"
  echo "  Running: ~\$65-80/month"
  echo "  Stopped: ~\$5-8/month"
  echo "══════════════════════════════════════"
}

deploy_latest() {
  log "Building and deploying to chiselgrid.com..."
  cd ~/projects/chisel-grid

  log "Building Next.js (static export)..."
  # Routes incompatible with output:export — temporarily move them outside src.
  # /admin and /api are served by Lambda via CloudFront (default S3, /admin/*
  # and /api/* → API Gateway), so S3 does not need their HTML. Move the
  # entire /admin and /api dirs to avoid prerender failures on new admin
  # pages that use headers()/cookies()/dynamic APIs.
  BACKUP_DIR="/tmp/_chiselgrid_export_backup"
  rm -rf "$BACKUP_DIR" && mkdir -p "$BACKUP_DIR"
  if [ -d "apps/web/src/app/api" ]; then
    mv "apps/web/src/app/api" "$BACKUP_DIR/api"
    log "Excluded API routes from static build"
  fi
  if [ -d "apps/web/src/app/admin" ]; then
    mv "apps/web/src/app/admin" "$BACKUP_DIR/admin"
    log "Excluded /admin/* from static build (Lambda-served)"
  fi
  NEXT_OUTPUT=export pnpm build --filter=@chiselgrid/web
  BUILD_RC=$?
  # Restore excluded routes
  if [ -d "$BACKUP_DIR/api" ]; then
    mv "$BACKUP_DIR/api" "apps/web/src/app/api"
  fi
  if [ -d "$BACKUP_DIR/admin" ]; then
    mv "$BACKUP_DIR/admin" "apps/web/src/app/admin"
  fi
  rm -rf "$BACKUP_DIR"
  if [ $BUILD_RC -ne 0 ]; then
    warn "Build failed — check errors above"
    exit 1
  fi

  log "Syncing static files to S3..."
  if [ -d "apps/web/out" ]; then
    aws s3 sync apps/web/out/ s3://$S3_BUCKET/ \
      --delete \
      --cache-control "public,max-age=0,must-revalidate" \
      --profile $AWS_PROFILE --region $AWS_REGION
    aws s3 sync apps/web/out/_next/static/ \
      s3://$S3_BUCKET/_next/static/ \
      --cache-control "public,max-age=31536000,immutable" \
      --profile $AWS_PROFILE --region $AWS_REGION
  else
    warn "No 'out' directory found — checking .next/static..."
    aws s3 sync apps/web/.next/static/ \
      s3://$S3_BUCKET/_next/static/ \
      --cache-control "public,max-age=31536000,immutable" \
      --profile $AWS_PROFILE --region $AWS_REGION
  fi

  # CRITICAL: Lambda SSR'd /admin renders HTML referencing a DIFFERENT BUILD_ID
  # than the static export. The OpenNext build's chunks MUST also live in S3
  # or /admin loads with broken CSS/JS (default origin = S3 → 404 on missing
  # chunks). See CLAUDE.md permanent rule: "Both BUILD_IDs must coexist in S3".
  # The --delete flag is NOT used here because the static-export assets above
  # share /chunks/ and /css/ dirs with OpenNext.
  if [ -d "apps/web/.open-next/assets/_next/static" ]; then
    log "Syncing OpenNext (Lambda) BUILD_ID static assets..."
    aws s3 sync apps/web/.open-next/assets/_next/static/ \
      s3://$S3_BUCKET/_next/static/ \
      --cache-control "public,max-age=31536000,immutable" \
      --profile $AWS_PROFILE --region $AWS_REGION
  else
    warn "No .open-next/assets found — run 'npx open-next@latest build' before deploying,"
    warn "or /admin will be unstyled. See CLAUDE.md."
  fi

  log "Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id $CF_DIST_ID \
    --paths "/*" \
    --profile $AWS_PROFILE \
    --region us-east-1 > /dev/null

  ok "Deployed! chiselgrid.com updates in 2-3 minutes."
  echo "  URL: https://www.chiselgrid.com"

  echo ""
  log "=== Post-deploy smoke test ==="
  sleep 30
  HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chiselgrid.com || echo "000")
  LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chiselgrid.com/login || echo "000")
  ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chiselgrid.com/admin || echo "000")

  echo "  Homepage : $HOME_CODE  (expect 200)"
  echo "  Login    : $LOGIN_CODE  (expect 200)"
  echo "  Admin    : $ADMIN_CODE  (expect 307)"

  SMOKE_OK=1
  # /admin returning 200 means CloudFront is routing /admin to S3, bypassing
  # the Lambda auth guard (see CLAUDE.md "CLOUDFRONT BEHAVIOR REGRESSION").
  if [ "$ADMIN_CODE" = "200" ]; then
    echo ""
    warn "CRITICAL: /admin returned 200 — CloudFront is serving S3 not Lambda."
    warn "          CSS will be broken. Run: bash scripts/fix-cloudfront-behaviors.sh"
    echo ""
    SMOKE_OK=0
  fi
  if [ "$ADMIN_CODE" != "307" ] && [ "$ADMIN_CODE" != "302" ] && [ "$ADMIN_CODE" != "308" ]; then
    warn "/admin returned $ADMIN_CODE — auth redirect missing (CLAUDE.md rule #2)."
    SMOKE_OK=0
  fi
  if [ "$HOME_CODE" != "200" ] || [ "$LOGIN_CODE" != "200" ]; then
    warn "Homepage or /login returned non-200 — check CloudFront behaviors."
    SMOKE_OK=0
  fi

  if [ $SMOKE_OK -eq 1 ]; then
    ok "Smoke test passed."
  else
    warn "Smoke test failed. Do not demo until resolved."
  fi
  log "=== Smoke test complete ==="
}

case "${1:-status}" in
  on|start)   turn_on ;;
  off|stop)   turn_off ;;
  status)     show_status ;;
  wait)       wait_aurora ;;
  deploy)     deploy_latest ;;
  *)
    echo "Usage: bash scripts/chiselgrid-aws.sh [on|off|status|wait|deploy]"
    echo "  on     — Start Aurora"
    echo "  off    — Stop Aurora (saves ~\$50/month)"
    echo "  status — Show resource state and cost"
    echo "  wait   — Wait for Aurora to be ready"
    echo "  deploy — Build and deploy to chiselgrid.com"
    ;;
esac
