export {
  architectureAgent,
  type ArchitectureAgentInput,
} from './agents/architectureAgent';
export {
  architectureAgentStream,
  type StreamChunk,
} from './agents/architectureAgentStream';
export { ARCHITECTURE_SYSTEM_PROMPT } from './prompts/architecture.prompt';
export { bedrockClient, invokeModel, streamModel, MODEL_ID } from './bedrock';
export { validateArchitecture } from './validators/architectureValidator';
export type {
  ValidationFinding,
  ValidationResult,
} from './validators/architectureValidator';
