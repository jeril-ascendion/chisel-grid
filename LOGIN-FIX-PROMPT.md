Read CLAUDE.md first. Complete these three tasks for ChiselGrid.

TASK 1 — FIX LOGIN CREDENTIALS:
The login shows Invalid email or password. Diagnose and fix.

Step 1: Check the actual user status in Cognito:
aws cognito-idp admin-get-user --user-pool-id ap-southeast-1_udIDE5cgD --username jeril.panicker@ascendion.com --profile PowerUserAccess-852973339602 --region ap-southeast-1

Step 2: Reset password to make sure it is permanent:
aws cognito-idp admin-set-user-password --user-pool-id ap-southeast-1_udIDE5cgD --username jeril.panicker@ascendion.com --password ChiselGrid@2026! --permanent --profile PowerUserAccess-852973339602 --region ap-southeast-1

Step 3: Test Cognito directly using a Python script file (do not use inline python3 -c):
Create /tmp/test-cognito.py with this content:
import boto3, hmac, hashlib, base64
client_id = open('apps/web/.env.local').read().split('COGNITO_CLIENT_ID=')[1].split('\n')[0].strip()
client_secret = open('apps/web/.env.local').read().split('COGNITO_CLIENT_SECRET=')[1].split('\n')[0].strip()
username = 'jeril.panicker@ascendion.com'
message = username + client_id
secret_hash = base64.b64encode(hmac.new(client_secret.encode('utf-8'), msg=message.encode('utf-8'), digestmod=hashlib.sha256).digest()).decode()
print(f'SECRET_HASH: {secret_hash}')
client = boto3.client('cognito-idp', region_name='ap-southeast-1')
try:
    result = client.initiate_auth(AuthFlow='USER_PASSWORD_AUTH', AuthParameters={'USERNAME': username, 'PASSWORD': 'ChiselGrid@2026!', 'SECRET_HASH': secret_hash}, ClientId=client_id)
    print('SUCCESS:', result['AuthenticationResult']['AccessToken'][:50])
except Exception as e:
    print('ERROR:', e)

Then run: cd ~/projects/chisel-grid && python3 /tmp/test-cognito.py

Step 4: Read apps/web/src/auth.ts and verify the SECRET_HASH computation matches exactly.
The formula must be: HMAC_SHA256(username + clientId, clientSecret) base64 encoded.
Fix auth.ts if the formula is different.

Step 5: Start dev server, test login, confirm redirect to /admin on success.

TASK 2 — ADD SIGN IN BUTTON TO HOMEPAGE AND NAV:
Read apps/web/src/app/page.tsx and apps/web/src/components/layout/header.tsx.

In the hero section of page.tsx, add a Sign In button:
- Use Next.js Link component: href="/login"
- Style: dark background, white text, rounded, matches existing button styles
- Position: below the hero description text

In header.tsx, add to the right side of the nav (next to search and dark mode icons):
- Import useSession from next-auth/react, mark the component as use client if needed
- If no session: show Sign In link to /login
- If session exists: show user email truncated + Sign Out button that calls signOut()
- Style: small text, subtle, consistent with existing nav links

TASK 3 — PASSWORD VISIBILITY TOGGLE:
Read apps/web/src/app/login/credentials-form.tsx.
Add eye toggle to password field:
- useState for showPassword boolean
- input type changes between password and text
- Position a button absolutely on the right side of the password input
- Use inline SVG eye icon — no new packages
- Eye open SVG when password hidden, eye with slash when visible
- button type must be button not submit

ACCEPTANCE CRITERIA:
- Correct credentials navigates to /admin
- Wrong credentials shows error message
- Homepage has Sign In button
- Nav shows Sign In when logged out and user info when logged in
- Password field has eye toggle

After all tasks pass:
git add apps/web/src/
git commit -m "fix: working login, Sign In button on homepage and nav, password visibility toggle"
git push origin develop

Output LOGINUXCOMPLETE when all criteria pass.
