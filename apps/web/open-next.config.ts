import type { OpenNextConfig } from '@opennextjs/aws/types/open-next.js';

const config: OpenNextConfig = {
  default: { override: { wrapper: 'aws-lambda-streaming', converter: 'aws-apigw-v2' } },
  buildCommand: 'pnpm build',
};

export default config;
