/**
 * T-20.1 Teams App Entry Point
 *
 * Initializes the Teams AI Library app with Bedrock-backed ActionPlanner,
 * registers all bot actions (knowledge, creator, admin), and starts
 * the restify HTTP server for Bot Framework messaging.
 */

import restify from 'restify';
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  MemoryStorage,
} from 'botbuilder';
import { Application, ActionPlanner, OpenAIModel, PromptManager } from '@microsoft/teams-ai';
import { loadConfig } from './config';
import { BedrockChatCompletionClient } from './bedrock-client';
import { registerKnowledgeActions } from './actions/knowledge';
import { registerCreatorActions } from './actions/creator';
import { registerAdminActions } from './actions/admin';

const config = loadConfig();

// Bot Framework adapter
const botAuth = new ConfigurationBotFrameworkAuthentication({}, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
const adapter = new CloudAdapter(botAuth);

adapter.onTurnError = async (context, error) => {
  console.error('[TeamsBot] Unhandled error:', error);
  await context.sendActivity('Sorry, something went wrong. Please try again.');
};

// Bedrock-backed model (OpenAI-compatible wrapper)
const bedrockClient = new BedrockChatCompletionClient(config.bedrockModelId);

// Teams AI app with MemoryStorage for development
const storage = new MemoryStorage();

const app = new Application({
  storage,
  ai: {
    planner: new ActionPlanner({
      model: {
        async completePrompt(context, memory, functions, tokenizer, template) {
          // Bridge to Bedrock client
          const messages = template.prompt.sections.map((s: any) => ({
            role: s.role ?? 'user',
            content: s.text ?? '',
          }));
          const response = await bedrockClient.createChatCompletion({
            model: config.bedrockModelId,
            messages,
            temperature: 0.7,
            max_tokens: 4096,
          });
          return {
            status: 'success' as const,
            message: response.choices[0]?.message ?? { role: 'assistant', content: '' },
          };
        },
      } as any,
      defaultPrompt: 'chat',
    }),
  },
});

// System prompt
app.ai.prompt('chat', async () => ({
  role: 'system',
  content: `You are a senior engineer with access to the Ascendion engineering knowledge base. Answer questions by searching the knowledge base first. Always cite the article title and author when referencing content. If no article exists on a topic, suggest creating one.`,
}));

// Register all action handlers
registerKnowledgeActions(app, config);
registerCreatorActions(app, config);
registerAdminActions(app, config);

// Start HTTP server
const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(context);
  });
});

server.listen(config.port, () => {
  console.log(`[TeamsBot] Listening on port ${config.port}`);
  console.log(`[TeamsBot] App ID: ${config.teamsAppId}`);
  console.log(`[TeamsBot] Bot ID: ${config.teamsBotId}`);
});

export { app, config };
