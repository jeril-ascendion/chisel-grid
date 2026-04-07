# Azure AD SCIM Provisioning — Admin Setup Guide

## Overview

ChiselGrid supports automatic user provisioning and deprovisioning via SCIM 2.0.
When configured, Azure AD will automatically:
- Create ChiselGrid user accounts when users are assigned to the Enterprise App
- Disable accounts when users are unassigned or deleted
- Sync user profile changes (name, email)
- Manage group memberships

## Prerequisites

- Azure AD admin access (Global Administrator or Application Administrator)
- ChiselGrid tenant admin access
- SCIM bearer token from ChiselGrid Admin Portal → Settings → Integrations → SCIM

## Step 1: Generate SCIM Token in ChiselGrid

1. Log in to your ChiselGrid Admin Portal
2. Navigate to **Settings** → **Integrations** → **SCIM Provisioning**
3. Click **Generate SCIM Token**
4. Copy the **Tenant URL** and **Secret Token** — you will need both
   - Tenant URL format: `https://api.chiselgrid.com/scim/v2`
   - Token is a long random string (keep it secret)

## Step 2: Create Enterprise Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **Enterprise Applications**
2. Click **+ New application** → **Create your own application**
3. Enter name: **ChiselGrid** (or your tenant name)
4. Select **Integrate any other application you don't find in the gallery (Non-gallery)**
5. Click **Create**

## Step 3: Configure SCIM Provisioning

1. In the ChiselGrid Enterprise App, go to **Provisioning** → **Get started**
2. Set **Provisioning Mode** to **Automatic**
3. Under **Admin Credentials**:
   - **Tenant URL**: Paste the Tenant URL from Step 1
     ```
     https://api.chiselgrid.com/scim/v2
     ```
   - **Secret Token**: Paste the SCIM token from Step 1
4. Click **Test Connection** — you should see "The supplied credentials are authorized..."
5. Click **Save**

## Step 4: Configure Attribute Mappings

1. Under **Mappings**, click **Provision Azure Active Directory Users**
2. Verify these mappings exist (create if missing):

| Azure AD Attribute | ChiselGrid SCIM Attribute | Matching |
|---|---|---|
| `userPrincipalName` | `userName` | Yes (match) |
| `givenName` | `name.givenName` | No |
| `surname` | `name.familyName` | No |
| `displayName` | `displayName` | No |
| `mail` | `emails[type eq "work"].value` | No |
| `Switch([IsSoftDeleted], , "False", "True", "True", "False")` | `active` | No |
| `objectId` | `externalId` | No |

3. Click **Save**

## Step 5: Configure Group Provisioning (Optional)

1. Under **Mappings**, click **Provision Azure Active Directory Groups**
2. Verify these mappings:

| Azure AD Attribute | ChiselGrid SCIM Attribute |
|---|---|
| `displayName` | `displayName` |
| `objectId` | `externalId` |
| `members` | `members` |

3. Click **Save**

## Step 6: Assign Users and Groups

1. Go to **Users and groups** → **+ Add user/group**
2. Select the users or groups you want to provision to ChiselGrid
3. Click **Assign**

## Step 7: Start Provisioning

1. Go back to **Provisioning**
2. Click **Start provisioning**
3. Azure AD will run an initial sync (may take up to 40 minutes)
4. Subsequent incremental syncs run every ~40 minutes automatically

## Step 8: Verify

1. Check the **Provisioning logs** in Azure AD for success/failure
2. Log in to ChiselGrid Admin Portal → **Users** to see provisioned accounts
3. Provisioned users will receive a Welcome email with login instructions

## Troubleshooting

### Test Connection Fails
- Verify the Tenant URL ends with `/scim/v2` (no trailing slash)
- Verify the token is correct (re-generate if needed)
- Check that the ChiselGrid SCIM endpoint is reachable from Azure

### Users Not Provisioning
- Check **Provisioning logs** for specific error messages
- Ensure users are **assigned** to the Enterprise App
- Verify attribute mappings match the table above
- Wait for the next sync cycle (up to 40 minutes)

### Users Not Deprovisioning
- Azure AD sets `active=false` rather than deleting — ChiselGrid disables the Cognito account
- Check that the `active` attribute mapping uses the `IsSoftDeleted` switch expression

## SCIM Endpoints Reference

| Endpoint | Description |
|---|---|
| `GET /scim/v2/ServiceProviderConfig` | Server capabilities |
| `GET /scim/v2/Schemas` | Supported schemas |
| `GET /scim/v2/Users` | List users (supports `filter`) |
| `POST /scim/v2/Users` | Create user |
| `GET /scim/v2/Users/:id` | Get user |
| `PATCH /scim/v2/Users/:id` | Update user |
| `PUT /scim/v2/Users/:id` | Replace user |
| `DELETE /scim/v2/Users/:id` | Disable user |
| `GET /scim/v2/Groups` | List groups |
| `POST /scim/v2/Groups` | Create group |
| `GET /scim/v2/Groups/:id` | Get group |
| `PATCH /scim/v2/Groups/:id` | Update group members |
| `DELETE /scim/v2/Groups/:id` | Delete group |

## Security Notes

- SCIM tokens are stored in AWS Secrets Manager, encrypted at rest
- All SCIM endpoints require valid bearer token authentication
- Tokens can be rotated from the ChiselGrid Admin Portal
- Each tenant has its own isolated SCIM token
- SCIM traffic is encrypted via TLS 1.2+
