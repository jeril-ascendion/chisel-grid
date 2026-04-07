/**
 * T-23.1 SCIM 2.0 Groups Endpoint
 *
 * Implements /scim/v2/Groups per RFC 7644.
 * Maps SCIM groups to Cognito User Pool groups.
 */

import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  GetGroupCommand,
  ListGroupsCommand,
  DeleteGroupCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersInGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});
const secrets = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const SCIM_TOKENS_SECRET = process.env.SCIM_TOKENS_SECRET ?? 'chiselgrid/scim-tokens';
const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

interface LambdaEvent {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
}

function scimResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/scim+json' },
    body: JSON.stringify(body),
  };
}

function scimError(statusCode: number, detail: string) {
  return scimResponse(statusCode, {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    detail,
    status: statusCode,
  });
}

async function validateToken(authHeader: string | undefined): Promise<{
  valid: boolean;
  tenantId: string;
  userPoolId: string;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, tenantId: '', userPoolId: '' };
  }

  try {
    const result = await secrets.send(
      new GetSecretValueCommand({ SecretId: SCIM_TOKENS_SECRET }),
    );
    const tokens: Record<string, { tenantId: string; userPoolId: string }> =
      JSON.parse(result.SecretString ?? '{}');
    const entry = tokens[authHeader.slice(7)];
    if (entry) return { valid: true, ...entry };
  } catch {
    // Fall through
  }

  return { valid: false, tenantId: '', userPoolId: '' };
}

export async function handler(event: LambdaEvent) {
  const baseUrl = `https://${event.headers.host ?? event.headers.Host ?? 'api.chiselgrid.com'}`;
  const groupId = event.pathParameters?.id;

  const auth = await validateToken(event.headers.authorization ?? event.headers.Authorization);
  if (!auth.valid) return scimError(401, 'Invalid or missing bearer token');

  const { userPoolId } = auth;

  try {
    // POST /scim/v2/Groups — create group
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body ?? '{}');
      const displayName = body.displayName as string;
      if (!displayName) return scimError(400, 'displayName is required');

      await cognito.send(
        new CreateGroupCommand({
          UserPoolId: userPoolId,
          GroupName: displayName,
          Description: `SCIM-provisioned group: ${displayName}`,
        }),
      );

      // Add members if specified
      const members = (body.members ?? []) as Array<{ value: string }>;
      for (const member of members) {
        await cognito.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            GroupName: displayName,
            Username: member.value,
          }),
        );
      }

      const now = new Date().toISOString();
      return scimResponse(201, {
        schemas: [SCIM_GROUP_SCHEMA],
        id: displayName,
        displayName,
        members: members.map((m) => ({ value: m.value, display: m.value })),
        meta: {
          resourceType: 'Group',
          created: now,
          lastModified: now,
          location: `${baseUrl}/scim/v2/Groups/${displayName}`,
        },
      });
    }

    // GET /scim/v2/Groups/:id
    if (event.httpMethod === 'GET' && groupId) {
      const result = await cognito.send(
        new GetGroupCommand({ UserPoolId: userPoolId, GroupName: groupId }),
      );

      const membersResult = await cognito.send(
        new ListUsersInGroupCommand({ UserPoolId: userPoolId, GroupName: groupId, Limit: 60 }),
      );

      return scimResponse(200, {
        schemas: [SCIM_GROUP_SCHEMA],
        id: result.Group!.GroupName,
        displayName: result.Group!.GroupName,
        members: (membersResult.Users ?? []).map((u) => ({
          value: u.Username,
          display: u.Username,
        })),
        meta: {
          resourceType: 'Group',
          created: result.Group!.CreationDate?.toISOString(),
          lastModified: result.Group!.LastModifiedDate?.toISOString(),
          location: `${baseUrl}/scim/v2/Groups/${groupId}`,
        },
      });
    }

    // GET /scim/v2/Groups — list groups
    if (event.httpMethod === 'GET' && !groupId) {
      const result = await cognito.send(
        new ListGroupsCommand({ UserPoolId: userPoolId, Limit: 60 }),
      );

      const groups = (result.Groups ?? []).map((g) => ({
        schemas: [SCIM_GROUP_SCHEMA],
        id: g.GroupName,
        displayName: g.GroupName,
        meta: {
          resourceType: 'Group',
          created: g.CreationDate?.toISOString(),
          lastModified: g.LastModifiedDate?.toISOString(),
          location: `${baseUrl}/scim/v2/Groups/${g.GroupName}`,
        },
      }));

      return scimResponse(200, {
        schemas: [SCIM_LIST_SCHEMA],
        totalResults: groups.length,
        startIndex: 1,
        itemsPerPage: groups.length,
        Resources: groups,
      });
    }

    // PATCH /scim/v2/Groups/:id — update membership
    if (event.httpMethod === 'PATCH' && groupId) {
      const body = JSON.parse(event.body ?? '{}');
      const operations = body.Operations ?? [];

      for (const op of operations) {
        if (op.op === 'add' && op.path === 'members') {
          for (const member of op.value as Array<{ value: string }>) {
            await cognito.send(
              new AdminAddUserToGroupCommand({
                UserPoolId: userPoolId,
                GroupName: groupId,
                Username: member.value,
              }),
            );
          }
        }

        if (op.op === 'remove' && op.path?.startsWith('members[value eq')) {
          const match = op.path.match(/members\[value eq "([^"]+)"\]/);
          if (match) {
            await cognito.send(
              new AdminRemoveUserFromGroupCommand({
                UserPoolId: userPoolId,
                GroupName: groupId,
                Username: match[1]!,
              }),
            );
          }
        }
      }

      // Return updated group
      const getResult = await cognito.send(
        new GetGroupCommand({ UserPoolId: userPoolId, GroupName: groupId }),
      );
      const membersResult = await cognito.send(
        new ListUsersInGroupCommand({ UserPoolId: userPoolId, GroupName: groupId }),
      );

      return scimResponse(200, {
        schemas: [SCIM_GROUP_SCHEMA],
        id: groupId,
        displayName: groupId,
        members: (membersResult.Users ?? []).map((u) => ({
          value: u.Username,
          display: u.Username,
        })),
        meta: {
          resourceType: 'Group',
          created: getResult.Group!.CreationDate?.toISOString(),
          lastModified: getResult.Group!.LastModifiedDate?.toISOString(),
          location: `${baseUrl}/scim/v2/Groups/${groupId}`,
        },
      });
    }

    // DELETE /scim/v2/Groups/:id
    if (event.httpMethod === 'DELETE' && groupId) {
      await cognito.send(
        new DeleteGroupCommand({ UserPoolId: userPoolId, GroupName: groupId }),
      );
      return { statusCode: 204, headers: {}, body: '' };
    }

    return scimError(405, 'Method not allowed');
  } catch (err) {
    console.error('SCIM Groups error:', err);
    return scimError(500, err instanceof Error ? err.message : 'Internal server error');
  }
}
