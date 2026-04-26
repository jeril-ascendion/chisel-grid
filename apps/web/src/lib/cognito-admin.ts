import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminResetUserPasswordCommand,
  type AttributeType,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';

const ROLES = ['admin', 'creator', 'reader'] as const;
export type UserRole = (typeof ROLES)[number];

function parseUserPoolFromIssuer(): { region: string; userPoolId: string } {
  const issuer = process.env.COGNITO_ISSUER_URL ?? process.env.COGNITO_ISSUER ?? '';
  const region =
    issuer.match(/cognito-idp\.(.+?)\.amazonaws/)?.[1] ??
    process.env.AWS_REGION ??
    'ap-southeast-1';
  const userPoolId =
    issuer.split('/').pop() ??
    process.env.COGNITO_USER_POOL_ID ??
    '';
  return { region, userPoolId };
}

let cachedClient: CognitoIdentityProviderClient | null = null;
export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cachedClient) {
    const { region } = parseUserPoolFromIssuer();
    cachedClient = new CognitoIdentityProviderClient({ region });
  }
  return cachedClient;
}

export function getUserPoolId(): string {
  return parseUserPoolFromIssuer().userPoolId;
}

function attr(attrs: AttributeType[] | undefined, name: string): string | undefined {
  return attrs?.find((a) => a.Name === name)?.Value;
}

export function deriveRoleFromGroups(groups: string[]): UserRole | null {
  if (groups.includes('admin') || groups.includes('admins')) return 'admin';
  if (groups.includes('creator') || groups.includes('creators')) return 'creator';
  if (groups.includes('reader') || groups.includes('readers')) return 'reader';
  return null;
}

export interface UserSummary {
  username: string;
  email: string;
  status: string;
  role: UserRole | null;
  groups: string[];
  enabled: boolean;
  createdAt: string | null;
}

export async function listUsersWithGroups(): Promise<UserSummary[]> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();

  const users: UserType[] = [];
  let paginationToken: string | undefined;
  do {
    const res = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Limit: 60,
        PaginationToken: paginationToken,
      }),
    );
    users.push(...(res.Users ?? []));
    paginationToken = res.PaginationToken;
  } while (paginationToken);

  const results: UserSummary[] = [];
  for (const u of users) {
    const username = u.Username ?? '';
    const email = attr(u.Attributes, 'email') ?? '';
    const groupsRes = await client.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      }),
    );
    const groups = (groupsRes.Groups ?? [])
      .map((g) => g.GroupName)
      .filter((g): g is string => !!g);
    results.push({
      username,
      email,
      status: u.UserStatus ?? 'UNKNOWN',
      role: deriveRoleFromGroups(groups),
      groups,
      enabled: u.Enabled ?? true,
      createdAt: u.UserCreateDate?.toISOString() ?? null,
    });
  }
  return results;
}

export async function getUserDetail(username: string): Promise<UserSummary | null> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  try {
    const res = await client.send(
      new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
    const email = attr(res.UserAttributes, 'email') ?? '';
    const groupsRes = await client.send(
      new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
    const groups = (groupsRes.Groups ?? [])
      .map((g) => g.GroupName)
      .filter((g): g is string => !!g);
    return {
      username: res.Username ?? username,
      email,
      status: res.UserStatus ?? 'UNKNOWN',
      role: deriveRoleFromGroups(groups),
      groups,
      enabled: res.Enabled ?? true,
      createdAt: res.UserCreateDate?.toISOString() ?? null,
    };
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'UserNotFoundException') return null;
    throw err;
  }
}

export async function createCognitoUser(params: {
  email: string;
  password: string;
  role: UserRole;
  sendWelcomeEmail: boolean;
}): Promise<void> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  const { email, password, role, sendWelcomeEmail } = params;

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: password,
      MessageAction: sendWelcomeEmail ? undefined : 'SUPPRESS',
      DesiredDeliveryMediums: sendWelcomeEmail ? ['EMAIL'] : undefined,
    }),
  );

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    }),
  );

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: role,
    }),
  );
}

export async function updateUserRole(username: string, newRole: UserRole): Promise<void> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  const currentRes = await client.send(
    new AdminListGroupsForUserCommand({ UserPoolId: userPoolId, Username: username }),
  );
  const current = (currentRes.Groups ?? [])
    .map((g) => g.GroupName)
    .filter((g): g is string => !!g);
  const roleGroups = ['admin', 'creator', 'reader', 'admins', 'creators', 'readers'];
  for (const g of current) {
    if (roleGroups.includes(g) && g !== newRole) {
      await client.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: username,
          GroupName: g,
        }),
      );
    }
  }
  if (!current.includes(newRole)) {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: newRole,
      }),
    );
  }
}

export async function setUserPassword(username: string, password: string): Promise<void> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    }),
  );
}

export async function setUserEnabled(username: string, enabled: boolean): Promise<void> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  if (enabled) {
    await client.send(
      new AdminEnableUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
  } else {
    await client.send(
      new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
  }
}

export async function deleteCognitoUser(username: string): Promise<void> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  await client.send(
    new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }),
  );
}

export async function triggerWelcomeEmail(username: string): Promise<void> {
  const client = getCognitoClient();
  const userPoolId = getUserPoolId();
  await client.send(
    new AdminResetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
    }),
  );
}

export function isValidAscendionEmail(email: string): boolean {
  return /^[^@\s]+@ascendion\.com$/i.test(email.trim());
}

export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
