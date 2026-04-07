/**
 * Teams App Configuration
 *
 * All configuration sourced from environment variables.
 * Never hardcode TEAMS_APP_ID or TEAMS_BOT_ID.
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  teamsAppId: z.string().uuid(),
  teamsBotId: z.string().min(1),
  chiselGridApiUrl: z.string().url(),
  awsRegion: z.string().default('ap-southeast-1'),
  bedrockModelId: z.string().default('anthropic.claude-sonnet-4-20250514'),
  port: z.coerce.number().default(3978),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
  return ConfigSchema.parse({
    teamsAppId: process.env.TEAMS_APP_ID,
    teamsBotId: process.env.TEAMS_BOT_ID,
    chiselGridApiUrl: process.env.CHISELGRID_API_URL ?? 'https://api.chiselgrid.com',
    awsRegion: process.env.AWS_REGION,
    bedrockModelId: process.env.BEDROCK_MODEL_ID,
    port: process.env.PORT,
  });
}
