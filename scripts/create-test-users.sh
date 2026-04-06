#!/bin/bash
set -e

USER_POOL_ID=ap-southeast-1_udIDE5cgD
PROFILE=PowerUserAccess-852973339602
REGION=ap-southeast-1

echo "Creating admin user..."
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username jeril.panicker@ascendion.com \
  --user-attributes Name=email,Value=jeril.panicker@ascendion.com \
  --temporary-password "ChiselGrid@2026!" \
  --message-action SUPPRESS \
  --profile $PROFILE \
  --region $REGION

echo "Adding to admins group..."
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username jeril.panicker@ascendion.com \
  --group-name admins \
  --profile $PROFILE \
  --region $REGION

echo "Creating creator user..."
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username testcreator@ascendion.com \
  --user-attributes Name=email,Value=testcreator@ascendion.com \
  --temporary-password "ChiselGrid@2026!" \
  --message-action SUPPRESS \
  --profile $PROFILE \
  --region $REGION

echo "Adding to creators group..."
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username testcreator@ascendion.com \
  --group-name creators \
  --profile $PROFILE \
  --region $REGION

echo ""
echo "Done. Test accounts created:"
echo "  Admin:   jeril.panicker@ascendion.com / ChiselGrid@2026!"
echo "  Creator: testcreator@ascendion.com / ChiselGrid@2026!"
