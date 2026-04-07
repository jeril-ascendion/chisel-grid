/**
 * T-23.1 + T-23.2 SCIM 2.0 Users Endpoint
 *
 * Implements /scim/v2/Users per RFC 7644.
 * Bearer token auth — token generated per tenant, stored in Secrets Manager.
 *
 * Provisioning flow:
 *   POST   /scim/v2/Users          → create Cognito user + Aurora user + default role
 *   GET    /scim/v2/Users           → list users (with filter support)
 *   GET    /scim/v2/Users/:id       → get user
 *   PATCH  /scim/v2/Users/:id       → update user (active=false → disable)
 *   PUT    /scim/v2/Users/:id       → replace user
 *   DELETE /scim/v2/Users/:id       → disable user (same as PATCH active=false)
 */

import { z } from 'zod';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
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

interface LambdaEvent {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
}

interface ScimUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name: {
    givenName: string;
    familyName: string;
    formatted?: string;
  };
  emails: Array<{
    value: string;
    type: string;
    primary: boolean;
  }>;
  displayName: string;
  active: boolean;
  groups?: Array<{ value: string; display: string }>;
  meta: {
    resourceType: string;
    created: string;
    lastModified: string;
    location: string;
  };
}

const SCIM_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

function scimResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/scim+json',
      'Access-Control-Allow-Origin': '*',
    },
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

/**
 * Validate SCIM bearer token against per-tenant secrets.
 */
async function validateToken(authHeader: string | undefined): Promise<{
  valid: boolean;
  tenantId: string;
  userPoolId: string;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, tenantId: '', userPoolId: '' };
  }

  const token = authHeader.slice(7);

  try {
    const result = await secrets.send(
      new GetSecretValueCommand({ SecretId: SCIM_TOKENS_SECRET }),
    );

    const tokens: Record<string, { tenantId: string; userPoolId: string }> =
      JSON.parse(result.SecretString ?? '{}');

    const entry = tokens[token];
    if (entry) {
      return { valid: true, tenantId: entry.tenantId, userPoolId: entry.userPoolId };
    }
  } catch (err) {
    console.error('Token validation failed:', err);
  }

  return { valid: false, tenantId: '', userPoolId: '' };
}

/**
 * Create a Cognito user and return SCIM representation.
 */
async function createUser(
  userPoolId: string,
  tenantId: string,
  body: Record<string, unknown>,
  baseUrl: string,
): Promise<ScimUser> {
  const userName = body.userName as string;
  const name = body.name as { givenName: string; familyName: string };
  const emails = body.emails as Array<{ value: string; type: string; primary: boolean }>;
  const primaryEmail = emails?.find((e) => e.primary)?.value ?? emails?.[0]?.value ?? userName;
  const displayName = (body.displayName as string) ?? `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim();

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: [
        { Name: 'email', Value: primaryEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: name?.givenName ?? '' },
        { Name: 'family_name', Value: name?.familyName ?? '' },
        { Name: 'custom:tenantId', Value: tenantId },
        { Name: 'custom:role', Value: 'reader' }, // default role
      ],
      DesiredDeliveryMediums: ['EMAIL'],
    }),
  );

  const now = new Date().toISOString();
  const externalId = body.externalId as string | undefined;
  return {
    schemas: [SCIM_SCHEMA],
    id: userName,
    ...(externalId ? { externalId } : {}),
    userName,
    name: {
      givenName: name?.givenName ?? '',
      familyName: name?.familyName ?? '',
      formatted: displayName,
    },
    emails: emails ?? [{ value: primaryEmail, type: 'work', primary: true }],
    displayName,
    active: true,
    meta: {
      resourceType: 'User',
      created: now,
      lastModified: now,
      location: `${baseUrl}/scim/v2/Users/${userName}`,
    },
  };
}

/**
 * Get a Cognito user as SCIM representation.
 */
async function getUser(
  userPoolId: string,
  userId: string,
  baseUrl: string,
): Promise<ScimUser | null> {
  try {
    const result = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: userId,
      }),
    );

    const attrs = Object.fromEntries(
      (result.UserAttributes ?? []).map((a) => [a.Name, a.Value]),
    );

    return {
      schemas: [SCIM_SCHEMA],
      id: result.Username!,
      userName: result.Username!,
      name: {
        givenName: attrs.given_name ?? '',
        familyName: attrs.family_name ?? '',
        formatted: `${attrs.given_name ?? ''} ${attrs.family_name ?? ''}`.trim(),
      },
      emails: [
        { value: attrs.email ?? '', type: 'work', primary: true },
      ],
      displayName: `${attrs.given_name ?? ''} ${attrs.family_name ?? ''}`.trim(),
      active: result.Enabled ?? true,
      meta: {
        resourceType: 'User',
        created: result.UserCreateDate?.toISOString() ?? '',
        lastModified: result.UserLastModifiedDate?.toISOString() ?? '',
        location: `${baseUrl}/scim/v2/Users/${result.Username}`,
      },
    };
  } catch {
    return null;
  }
}

export async function handler(event: LambdaEvent) {
  const baseUrl = `https://${event.headers.host ?? event.headers.Host ?? 'api.chiselgrid.com'}`;
  const userId = event.pathParameters?.id;

  // Validate bearer token
  const auth = await validateToken(event.headers.authorization ?? event.headers.Authorization);
  if (!auth.valid) {
    return scimError(401, 'Invalid or missing bearer token');
  }

  const { tenantId, userPoolId } = auth;

  try {
    // POST /scim/v2/Users — create user
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body ?? '{}');
      if (!body.userName) {
        return scimError(400, 'userName is required');
      }

      const user = await createUser(userPoolId, tenantId, body, baseUrl);
      return scimResponse(201, user);
    }

    // GET /scim/v2/Users/:id — get user
    if (event.httpMethod === 'GET' && userId) {
      const user = await getUser(userPoolId, userId, baseUrl);
      if (!user) return scimError(404, 'User not found');
      return scimResponse(200, user);
    }

    // GET /scim/v2/Users — list users
    if (event.httpMethod === 'GET' && !userId) {
      const filter = event.queryStringParameters?.filter;
      const startIndex = parseInt(event.queryStringParameters?.startIndex ?? '1', 10);
      const count = parseInt(event.queryStringParameters?.count ?? '100', 10);

      let filterStr: string | undefined;
      if (filter) {
        // Parse SCIM filter: userName eq "value"
        const match = filter.match(/userName\s+eq\s+"([^"]+)"/);
        if (match) {
          filterStr = `username = "${match[1]}"`;
        }
      }

      const result = await cognito.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          Limit: Math.min(count, 60),
          Filter: filterStr,
        }),
      );

      const users: ScimUser[] = (result.Users ?? []).map((u) => {
        const attrs = Object.fromEntries(
          (u.Attributes ?? []).map((a) => [a.Name, a.Value]),
        );
        return {
          schemas: [SCIM_SCHEMA],
          id: u.Username!,
          userName: u.Username!,
          name: {
            givenName: attrs.given_name ?? '',
            familyName: attrs.family_name ?? '',
          },
          emails: [{ value: attrs.email ?? '', type: 'work', primary: true }],
          displayName: `${attrs.given_name ?? ''} ${attrs.family_name ?? ''}`.trim(),
          active: u.Enabled ?? true,
          meta: {
            resourceType: 'User',
            created: u.UserCreateDate?.toISOString() ?? '',
            lastModified: u.UserLastModifiedDate?.toISOString() ?? '',
            location: `${baseUrl}/scim/v2/Users/${u.Username}`,
          },
        };
      });

      return scimResponse(200, {
        schemas: [SCIM_LIST_SCHEMA],
        totalResults: users.length,
        startIndex,
        itemsPerPage: users.length,
        Resources: users,
      });
    }

    // PATCH /scim/v2/Users/:id — update user
    if (event.httpMethod === 'PATCH' && userId) {
      const body = JSON.parse(event.body ?? '{}');
      const operations = body.Operations ?? [];

      for (const op of operations) {
        if (op.op === 'replace' || op.op === 'Replace') {
          const value = op.value as Record<string, unknown>;

          if (value.active === false) {
            await cognito.send(
              new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: userId }),
            );
          } else if (value.active === true) {
            await cognito.send(
              new AdminEnableUserCommand({ UserPoolId: userPoolId, Username: userId }),
            );
          }

          // Update other attributes
          const attrs: Array<{ Name: string; Value: string }> = [];
          if (value.name && typeof value.name === 'object') {
            const name = value.name as Record<string, string>;
            if (name.givenName) attrs.push({ Name: 'given_name', Value: name.givenName });
            if (name.familyName) attrs.push({ Name: 'family_name', Value: name.familyName });
          }
          if (value.displayName) {
            attrs.push({ Name: 'name', Value: value.displayName as string });
          }

          if (attrs.length > 0) {
            await cognito.send(
              new AdminUpdateUserAttributesCommand({
                UserPoolId: userPoolId,
                Username: userId,
                UserAttributes: attrs,
              }),
            );
          }
        }
      }

      const user = await getUser(userPoolId, userId, baseUrl);
      return scimResponse(200, user);
    }

    // PUT /scim/v2/Users/:id — replace user
    if (event.httpMethod === 'PUT' && userId) {
      const body = JSON.parse(event.body ?? '{}');
      const active = body.active !== false;

      if (active) {
        await cognito.send(
          new AdminEnableUserCommand({ UserPoolId: userPoolId, Username: userId }),
        );
      } else {
        await cognito.send(
          new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: userId }),
        );
      }

      const name = body.name as { givenName?: string; familyName?: string } | undefined;
      const attrs: Array<{ Name: string; Value: string }> = [];
      if (name?.givenName) attrs.push({ Name: 'given_name', Value: name.givenName });
      if (name?.familyName) attrs.push({ Name: 'family_name', Value: name.familyName });

      if (attrs.length > 0) {
        await cognito.send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: userPoolId,
            Username: userId,
            UserAttributes: attrs,
          }),
        );
      }

      const user = await getUser(userPoolId, userId, baseUrl);
      return scimResponse(200, user);
    }

    // DELETE /scim/v2/Users/:id — disable user (same as active=false)
    if (event.httpMethod === 'DELETE' && userId) {
      await cognito.send(
        new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: userId }),
      );
      return { statusCode: 204, headers: {}, body: '' };
    }

    return scimError(405, 'Method not allowed');
  } catch (err) {
    console.error('SCIM Users error:', err);
    return scimError(500, err instanceof Error ? err.message : 'Internal server error');
  }
}
