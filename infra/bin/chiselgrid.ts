#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { getConfig } from '../lib/config';
import { NetworkStack } from '../lib/stacks/network.stack';
import { DataStack } from '../lib/stacks/data.stack';
import { AuthStack } from '../lib/stacks/auth.stack';
import { StorageStack } from '../lib/stacks/storage.stack';
import { ApiStack } from '../lib/stacks/api.stack';
import { AiStack } from '../lib/stacks/ai.stack';
import { AudioStack } from '../lib/stacks/audio.stack';

const app = new App();
const { env, config } = getConfig(app);

const envProps = { env: { account: config.account, region: config.region } };
const prefix = `ChiselGrid-${env.charAt(0).toUpperCase() + env.slice(1)}`;

// Stacks — dependency order enforced by constructor arguments
const networkStack = new NetworkStack(app, `${prefix}-Network`, config, envProps);
const dataStack = new DataStack(app, `${prefix}-Data`, networkStack, config, envProps);
const authStack = new AuthStack(app, `${prefix}-Auth`, config, envProps);
const storageStack = new StorageStack(app, `${prefix}-Storage`, config, envProps);
const apiStack = new ApiStack(app, `${prefix}-Api`, networkStack, dataStack, config, envProps);
const aiStack = new AiStack(app, `${prefix}-Ai`, config, envProps);
const audioStack = new AudioStack(app, `${prefix}-Audio`, config, {
  mediaBucket: storageStack.outputs.mediaBucket,
  cloudFrontDomain: storageStack.outputs.mediaDistributionDomain,
}, envProps);

// Suppress unused variable warnings for stacks not yet fully wired
void apiStack; void aiStack; void audioStack;

// Global tags on all stacks
Tags.of(app).add('Project', 'ChiselGrid');
Tags.of(app).add('Environment', env);
Tags.of(app).add('Owner', 'ascendion-engineering');
Tags.of(app).add('ManagedBy', 'CDK');
