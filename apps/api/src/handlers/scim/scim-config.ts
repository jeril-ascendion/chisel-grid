/**
 * T-23.1 SCIM 2.0 ServiceProviderConfig and Schemas
 *
 * /scim/v2/ServiceProviderConfig — capabilities of this SCIM server
 * /scim/v2/Schemas               — User and Group schema definitions
 */

interface LambdaEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string>;
}

function scimResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/scim+json' },
    body: JSON.stringify(body),
  };
}

const SERVICE_PROVIDER_CONFIG = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
  documentationUri: 'https://docs.chiselgrid.com/scim',
  patch: { supported: true },
  bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
  filter: { supported: true, maxResults: 100 },
  changePassword: { supported: false },
  sort: { supported: false },
  etag: { supported: false },
  authenticationSchemes: [
    {
      name: 'OAuth Bearer Token',
      description: 'Authentication scheme using the OAuth Bearer Token Standard',
      specUri: 'https://www.rfc-editor.org/info/rfc6750',
      documentationUri: 'https://docs.chiselgrid.com/scim/auth',
      type: 'oauthbearertoken',
      primary: true,
    },
  ],
};

const USER_SCHEMA = {
  id: 'urn:ietf:params:scim:schemas:core:2.0:User',
  name: 'User',
  description: 'User Account',
  attributes: [
    { name: 'userName', type: 'string', multiValued: false, required: true, mutability: 'readWrite', returned: 'default', uniqueness: 'server' },
    { name: 'name', type: 'complex', multiValued: false, required: true, mutability: 'readWrite', returned: 'default',
      subAttributes: [
        { name: 'givenName', type: 'string', multiValued: false, required: true, mutability: 'readWrite' },
        { name: 'familyName', type: 'string', multiValued: false, required: true, mutability: 'readWrite' },
        { name: 'formatted', type: 'string', multiValued: false, required: false, mutability: 'readOnly' },
      ],
    },
    { name: 'displayName', type: 'string', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
    { name: 'emails', type: 'complex', multiValued: true, required: true, mutability: 'readWrite', returned: 'default',
      subAttributes: [
        { name: 'value', type: 'string', multiValued: false, required: true },
        { name: 'type', type: 'string', multiValued: false, required: false },
        { name: 'primary', type: 'boolean', multiValued: false, required: false },
      ],
    },
    { name: 'active', type: 'boolean', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
    { name: 'externalId', type: 'string', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
  ],
  meta: { resourceType: 'Schema', location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User' },
};

const GROUP_SCHEMA = {
  id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  name: 'Group',
  description: 'Group',
  attributes: [
    { name: 'displayName', type: 'string', multiValued: false, required: true, mutability: 'readWrite', returned: 'default' },
    { name: 'members', type: 'complex', multiValued: true, required: false, mutability: 'readWrite', returned: 'default',
      subAttributes: [
        { name: 'value', type: 'string', multiValued: false, required: true },
        { name: 'display', type: 'string', multiValued: false, required: false },
      ],
    },
  ],
  meta: { resourceType: 'Schema', location: '/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group' },
};

export async function handler(event: LambdaEvent) {
  // /scim/v2/ServiceProviderConfig
  if (event.path.endsWith('/ServiceProviderConfig')) {
    return scimResponse(200, SERVICE_PROVIDER_CONFIG);
  }

  // /scim/v2/Schemas
  if (event.path.endsWith('/Schemas')) {
    return scimResponse(200, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      Resources: [USER_SCHEMA, GROUP_SCHEMA],
    });
  }

  // /scim/v2/Schemas/:id
  if (event.path.includes('/Schemas/')) {
    const schemaId = event.path.split('/Schemas/')[1];
    if (schemaId === USER_SCHEMA.id) return scimResponse(200, USER_SCHEMA);
    if (schemaId === GROUP_SCHEMA.id) return scimResponse(200, GROUP_SCHEMA);
    return scimResponse(404, { detail: 'Schema not found', status: 404 });
  }

  return scimResponse(404, { detail: 'Not found', status: 404 });
}
