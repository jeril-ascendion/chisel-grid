import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  ACMClient,
  RequestCertificateCommand,
  DescribeCertificateCommand,
} from '@aws-sdk/client-acm';
import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { extractUserContext, jsonResponse } from '../types';

// ACM must be in us-east-1 for CloudFront certificates
const acmClient = new ACMClient({ region: 'us-east-1' });
const cloudFrontClient = new CloudFrontClient({});
const dynamoClient = new DynamoDBClient({});

const TENANT_POOLS_TABLE = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';
const DISTRIBUTION_ID = process.env['DISTRIBUTION_ID'] || '';

interface RequestDomainBody {
  customDomain: string;
  subdomain: string;
}

/**
 * Handles custom domain requests for tenants.
 *
 * POST: Request a new ACM certificate for a custom domain
 * GET: Check certificate validation status
 * PUT: Attach validated certificate to CloudFront distribution
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const method = event.httpMethod;

  if (method === 'POST') {
    return handleRequestCertificate(event);
  } else if (method === 'GET') {
    return handleCheckStatus(event);
  } else if (method === 'PUT') {
    return handleAttachCertificate(event);
  }

  return jsonResponse(405, { error: 'Method not allowed' });
}

async function handleRequestCertificate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return jsonResponse(400, { error: 'Request body required' });
  }

  const { customDomain, subdomain } = JSON.parse(event.body) as RequestDomainBody;
  if (!customDomain || !subdomain) {
    return jsonResponse(400, { error: 'Missing customDomain or subdomain' });
  }

  // Request ACM certificate with DNS validation
  const result = await acmClient.send(new RequestCertificateCommand({
    DomainName: customDomain,
    ValidationMethod: 'DNS',
    Tags: [
      { Key: 'Project', Value: 'ChiselGrid' },
      { Key: 'TenantSubdomain', Value: subdomain },
    ],
  }));

  const certificateArn = result.CertificateArn;

  // Store certificate ARN in tenant record
  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET customDomain = :domain, certificateArn = :arn, certificateStatus = :status',
    ExpressionAttributeValues: {
      ':domain': { S: customDomain },
      ':arn': { S: certificateArn || '' },
      ':status': { S: 'PENDING_VALIDATION' },
    },
  }));

  // Get the CNAME validation records
  // Note: Need a small delay for ACM to generate validation records
  const describe = await acmClient.send(new DescribeCertificateCommand({
    CertificateArn: certificateArn,
  }));

  const validationOptions = describe.Certificate?.DomainValidationOptions?.map((opt) => ({
    domainName: opt.DomainName,
    validationCname: opt.ResourceRecord?.Name,
    validationValue: opt.ResourceRecord?.Value,
    validationStatus: opt.ValidationStatus,
  })) || [];

  return jsonResponse(201, {
    certificateArn,
    customDomain,
    validationRecords: validationOptions,
    instructions: 'Add the CNAME validation records to your DNS, then call GET to check status.',
  });
}

async function handleCheckStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const certificateArn = event.queryStringParameters?.['certificateArn'];
  if (!certificateArn) {
    return jsonResponse(400, { error: 'Missing certificateArn query parameter' });
  }

  const describe = await acmClient.send(new DescribeCertificateCommand({
    CertificateArn: certificateArn,
  }));

  const status = describe.Certificate?.Status;
  const validationOptions = describe.Certificate?.DomainValidationOptions?.map((opt) => ({
    domainName: opt.DomainName,
    validationStatus: opt.ValidationStatus,
  })) || [];

  return jsonResponse(200, {
    certificateArn,
    status,
    validationOptions,
    isReady: status === 'ISSUED',
  });
}

async function handleAttachCertificate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return jsonResponse(400, { error: 'Request body required' });
  }

  const { certificateArn, customDomain, subdomain } = JSON.parse(event.body) as {
    certificateArn: string;
    customDomain: string;
    subdomain: string;
  };

  if (!certificateArn || !customDomain || !DISTRIBUTION_ID) {
    return jsonResponse(400, { error: 'Missing certificateArn, customDomain, or DISTRIBUTION_ID not configured' });
  }

  // Verify certificate is ISSUED
  const describe = await acmClient.send(new DescribeCertificateCommand({
    CertificateArn: certificateArn,
  }));

  if (describe.Certificate?.Status !== 'ISSUED') {
    return jsonResponse(409, {
      error: 'Certificate not yet validated',
      status: describe.Certificate?.Status,
    });
  }

  // Add custom domain as CNAME to CloudFront distribution
  const distConfig = await cloudFrontClient.send(new GetDistributionConfigCommand({
    Id: DISTRIBUTION_ID,
  }));

  const config = distConfig.DistributionConfig;
  if (!config) {
    return jsonResponse(500, { error: 'Could not retrieve distribution config' });
  }

  // Add the custom domain to the aliases
  const currentAliases = config.Aliases?.Items || [];
  if (!currentAliases.includes(customDomain)) {
    config.Aliases = {
      Quantity: currentAliases.length + 1,
      Items: [...currentAliases, customDomain],
    };
  }

  // Set the ACM certificate
  config.ViewerCertificate = {
    ACMCertificateArn: certificateArn,
    SSLSupportMethod: 'sni-only',
    MinimumProtocolVersion: 'TLSv1.2_2021',
  };

  await cloudFrontClient.send(new UpdateDistributionCommand({
    Id: DISTRIBUTION_ID,
    DistributionConfig: config,
    IfMatch: distConfig.ETag,
  }));

  // Update tenant record
  await dynamoClient.send(new UpdateItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    UpdateExpression: 'SET certificateStatus = :status',
    ExpressionAttributeValues: {
      ':status': { S: 'ATTACHED' },
    },
  }));

  return jsonResponse(200, {
    message: `Custom domain ${customDomain} attached to CloudFront distribution`,
    instructions: `Now CNAME ${customDomain} to the CloudFront distribution domain.`,
  });
}
