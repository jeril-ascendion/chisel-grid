import type { App } from 'aws-cdk-lib';

export interface EnvConfig {
  account: string;
  region: string;
  domain: string;
  auroraMinAcu: number;
  auroraMaxAcu: number;
  natGateways: number;
  enableDeletion: boolean;
}

export type EnvName = 'dev' | 'staging' | 'prod';

export function getConfig(app: App): { env: EnvName; config: EnvConfig } {
  const envName = (app.node.tryGetContext('env') as EnvName | undefined) ?? 'dev';
  const config = app.node.tryGetContext(envName) as EnvConfig | undefined;
  if (!config) throw new Error(`No CDK context found for env: ${envName}`);
  return { env: envName, config };
}
