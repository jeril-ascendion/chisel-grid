import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

// Mock AWS SDK before importing handler
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  AdminAddUserToGroupCommand: vi.fn(),
  AdminRemoveUserFromGroupCommand: vi.fn(),
  AdminDisableUserCommand: vi.fn(),
  AdminEnableUserCommand: vi.fn(),
  ListUsersCommand: vi.fn(),
  AdminListGroupsForUserCommand: vi.fn(),
}));

import { handler } from './users';

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/users',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      authorizer: {
        userId: 'admin-1',
        email: 'admin@test.com',
        role: 'admin',
        tenantId: 'tenant-1',
        groups: 'admins',
      },
      accountId: '',
      apiId: '',
      httpMethod: 'GET',
      identity: {} as any,
      path: '/users',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('users handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorization', () => {
    it('returns 403 for non-admin users', async () => {
      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          authorizer: {
            userId: 'user-1',
            email: 'user@test.com',
            role: 'reader',
            tenantId: 'tenant-1',
            groups: 'readers',
          },
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toEqual({ error: 'Forbidden: admin access required' });
    });

    it('returns 403 for creator users', async () => {
      const event = createEvent({
        requestContext: {
          ...createEvent().requestContext,
          authorizer: {
            userId: 'user-1',
            email: 'creator@test.com',
            role: 'creator',
            tenantId: 'tenant-1',
            groups: 'creators',
          },
        },
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
    });
  });

  describe('GET /users', () => {
    it('returns user list from Cognito', async () => {
      mockSend
        .mockResolvedValueOnce({
          Users: [
            {
              Username: 'user1',
              Attributes: [
                { Name: 'email', Value: 'user1@test.com' },
                { Name: 'name', Value: 'User One' },
              ],
              UserStatus: 'CONFIRMED',
              Enabled: true,
              UserCreateDate: new Date('2024-01-01'),
            },
          ],
        })
        .mockResolvedValueOnce({
          Groups: [{ GroupName: 'admins' }],
        });

      const event = createEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.users).toHaveLength(1);
      expect(body.users[0].email).toBe('user1@test.com');
      expect(body.users[0].groups).toContain('admins');
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('updates user role successfully', async () => {
      mockSend.mockResolvedValue({}); // All Cognito calls succeed

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/users/target-user/role',
        body: JSON.stringify({ role: 'creator' }),
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toContain('role updated to creator');
    });

    it('returns 400 for invalid role', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/users/target-user/role',
        body: JSON.stringify({ role: 'superadmin' }),
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('enables user', async () => {
      mockSend.mockResolvedValue({});

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/users/target-user/status',
        body: JSON.stringify({ enabled: true }),
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toContain('enabled');
    });

    it('disables user', async () => {
      mockSend.mockResolvedValue({});

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/users/target-user/status',
        body: JSON.stringify({ enabled: false }),
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toContain('disabled');
    });

    it('returns 400 for invalid body', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/users/target-user/status',
        body: JSON.stringify({ enabled: 'yes' }),
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for unknown path', async () => {
      const event = createEvent({ path: '/unknown' });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });
  });
});
