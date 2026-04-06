import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import { extractUserContext, jsonResponse } from '../types.js';

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

const PatchRoleSchema = z.object({
  role: z.enum(['admin', 'creator', 'reader']),
});

const PatchStatusSchema = z.object({
  enabled: z.boolean(),
});

const ROLE_TO_GROUP: Record<string, string> = {
  admin: 'admins',
  creator: 'creators',
  reader: 'readers',
};

const ALL_GROUPS = ['admins', 'creators', 'readers'];

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);

  // Only admins can manage users
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Forbidden: admin access required' });
  }

  const method = event.httpMethod;
  const path = event.path;

  // GET /users — list users
  if (method === 'GET' && path === '/users') {
    return listUsers();
  }

  // PATCH /users/:id/role
  const roleMatch = path.match(/^\/users\/([^/]+)\/role$/);
  if (method === 'PATCH' && roleMatch) {
    const targetUsername = roleMatch[1]!;
    return patchUserRole(targetUsername, event.body, userCtx);
  }

  // PATCH /users/:id/status
  const statusMatch = path.match(/^\/users\/([^/]+)\/status$/);
  if (method === 'PATCH' && statusMatch) {
    const targetUsername = statusMatch[1]!;
    return patchUserStatus(targetUsername, event.body, userCtx);
  }

  return jsonResponse(404, { error: 'Not found' });
}

async function listUsers(): Promise<APIGatewayProxyResult> {
  const result = await cognito.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60,
    }),
  );

  const users = await Promise.all(
    (result.Users ?? []).map(async (u) => {
      const username = u.Username ?? '';
      const attrs: Record<string, string> = {};
      for (const attr of u.Attributes ?? []) {
        if (attr.Name && attr.Value) attrs[attr.Name] = attr.Value;
      }

      // Get groups for each user
      let groups: string[] = [];
      try {
        const groupResult = await cognito.send(
          new AdminListGroupsForUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
          }),
        );
        groups = (groupResult.Groups ?? []).map((g) => g.GroupName ?? '');
      } catch {
        // Best effort
      }

      return {
        username,
        email: attrs['email'] ?? '',
        name: attrs['name'] ?? '',
        status: u.UserStatus,
        enabled: u.Enabled,
        groups,
        createdAt: u.UserCreateDate?.toISOString(),
      };
    }),
  );

  return jsonResponse(200, { users });
}

async function patchUserRole(
  targetUsername: string,
  body: string | null,
  userCtx: { userId: string; email: string },
): Promise<APIGatewayProxyResult> {
  const parsed = PatchRoleSchema.safeParse(JSON.parse(body ?? '{}'));
  if (!parsed.success) {
    return jsonResponse(400, { error: 'Invalid body', details: parsed.error.issues });
  }

  const newGroup = ROLE_TO_GROUP[parsed.data.role]!;

  // Remove from all groups first
  for (const group of ALL_GROUPS) {
    try {
      await cognito.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: targetUsername,
          GroupName: group,
        }),
      );
    } catch {
      // Ignore if not in group
    }
  }

  // Add to new group
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: targetUsername,
      GroupName: newGroup,
    }),
  );

  console.log(
    JSON.stringify({
      event: 'user.role.changed',
      targetUsername,
      newRole: parsed.data.role,
      changedBy: userCtx.userId,
      changedByEmail: userCtx.email,
      timestamp: new Date().toISOString(),
    }),
  );

  return jsonResponse(200, {
    message: `User ${targetUsername} role updated to ${parsed.data.role}`,
  });
}

async function patchUserStatus(
  targetUsername: string,
  body: string | null,
  userCtx: { userId: string; email: string },
): Promise<APIGatewayProxyResult> {
  const parsed = PatchStatusSchema.safeParse(JSON.parse(body ?? '{}'));
  if (!parsed.success) {
    return jsonResponse(400, { error: 'Invalid body', details: parsed.error.issues });
  }

  if (parsed.data.enabled) {
    await cognito.send(
      new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: targetUsername,
      }),
    );
  } else {
    await cognito.send(
      new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: targetUsername,
      }),
    );
  }

  console.log(
    JSON.stringify({
      event: 'user.status.changed',
      targetUsername,
      enabled: parsed.data.enabled,
      changedBy: userCtx.userId,
      changedByEmail: userCtx.email,
      timestamp: new Date().toISOString(),
    }),
  );

  return jsonResponse(200, {
    message: `User ${targetUsername} ${parsed.data.enabled ? 'enabled' : 'disabled'}`,
  });
}
