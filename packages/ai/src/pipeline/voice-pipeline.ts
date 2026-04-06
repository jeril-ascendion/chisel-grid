/**
 * T-17.4 / T-17.5: Voice content pipeline handler
 *
 * Orchestrates the voice-to-article flow within Step Functions:
 * 1. Receive transcript (from Transcribe)
 * 2. Structure Agent: clean and organize transcript
 * 3. Gap Detection Agent: find unresolved references
 * 4. Writer Agent: generate article from structured transcript
 * 5. Fidelity Agent: verify article faithfulness
 * 6. Review Agent: standard quality review (with fidelity score)
 * 7. Human Review Gate (sends push notification)
 *
 * Supports multi-language via Transcribe auto-detection.
 * Passes detected languageCode to Writer Agent.
 */

import type { ContentBlock } from '@chiselgrid/types';
import { BedrockClient } from '../bedrock-client.js';
import { StructureAgent } from '../agents/structure-agent.js';
import { WriterAgent } from '../agents/writer-agent.js';
import { ReviewAgent } from '../agents/review-agent.js';
import { FidelityAgent } from '../agents/fidelity-agent.js';
import { GapDetectionAgent } from '../agents/gap-detection-agent.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import type {
  StructuredTranscriptOutput,
  FidelityReport,
  GapDetectionResult,
  ReviewReport,
} from '../schemas.js';

export interface VoicePipelineInput {
  voiceId: string;
  tenantId: string;
  uploadedBy: string;
  transcriptText: string;
  languageCode: string;
  durationMs: number;
  contentType?: string;
  knowledgeContext?: string;
}

export interface VoicePipelineResult {
  voiceId: string;
  tenantId: string;
  structuredTranscript: StructuredTranscriptOutput;
  articleBlocks: ContentBlock[];
  fidelityReport: FidelityReport;
  gapDetection: GapDetectionResult;
  reviewReport: ReviewReport;
  languageCode: string;
  suggestedTitle: string;
  totalTokensUsed: { input: number; output: number };
  jobIds: string[];
}

export class VoiceContentPipeline {
  private readonly bedrock: BedrockClient;
  private readonly structureAgent: StructureAgent;
  private readonly writerAgent: WriterAgent;
  private readonly reviewAgent: ReviewAgent;
  private readonly fidelityAgent: FidelityAgent;
  private readonly gapAgent: GapDetectionAgent;

  constructor(bedrock: BedrockClient) {
    this.bedrock = bedrock;
    this.structureAgent = new StructureAgent(bedrock);
    this.writerAgent = new WriterAgent(bedrock);
    this.reviewAgent = new ReviewAgent(bedrock);
    this.fidelityAgent = new FidelityAgent(bedrock);
    this.gapAgent = new GapDetectionAgent(bedrock);
  }

  /**
   * Run the full voice-to-article pipeline.
   */
  async run(input: VoicePipelineInput): Promise<VoicePipelineResult> {
    const totalUsage = { input: 0, output: 0 };
    const jobIds: string[] = [];

    const trackUsage = (usage: { inputTokens: number; outputTokens: number }) => {
      totalUsage.input += usage.inputTokens;
      totalUsage.output += usage.outputTokens;
    };

    // Step 1: Structure the transcript
    console.log(`[VoicePipeline] Structuring transcript for ${input.voiceId}`);
    const structureResult = await this.structureAgent.structure({
      transcript: input.transcriptText,
      languageCode: input.languageCode,
      durationMs: input.durationMs,
    });
    trackUsage(structureResult.usage);

    const structured = structureResult.data;
    console.log(
      `[VoicePipeline] Structured into ${structured.sections.length} sections, ` +
        `${structureResult.fillerWordsRemoved} filler words removed`,
    );

    // Step 2: Gap detection (runs in parallel with writing)
    console.log(`[VoicePipeline] Detecting knowledge gaps for ${input.voiceId}`);
    const gapParams: { transcript: string; knowledgeContext?: string } = {
      transcript: structured.cleanedText,
    };
    if (input.knowledgeContext) {
      gapParams.knowledgeContext = input.knowledgeContext;
    }
    const gapPromise = this.gapAgent.detect(gapParams);

    // Step 3: Write article from structured transcript
    console.log(`[VoicePipeline] Writing article from transcript for ${input.voiceId}`);
    const writeResult = await this.bedrock.invoke(
      [
        {
          role: 'user',
          content: PROMPT_TEMPLATES.writeFromTranscript.buildUserMessage({
            structuredTranscript: JSON.stringify(structured),
            languageCode: input.languageCode,
            contentType: input.contentType ?? 'standard_doc',
          }),
        },
      ],
      {
        system: PROMPT_TEMPLATES.writeFromTranscript.system,
        maxTokens: 8192,
        temperature: 0.3,
      },
    );
    trackUsage({
      inputTokens: writeResult.usage.inputTokens,
      outputTokens: writeResult.usage.outputTokens,
    });

    // Parse article blocks
    const jsonStr = extractJson(writeResult.content);
    const articleBlocks = JSON.parse(jsonStr) as ContentBlock[];

    // Wait for gap detection
    const gapResult = await gapPromise;
    trackUsage(gapResult.usage);

    // Step 4: Fidelity check
    console.log(`[VoicePipeline] Checking fidelity for ${input.voiceId}`);
    const fidelityResult = await this.fidelityAgent.check({
      transcript: structured.cleanedText,
      articleBlocks: JSON.stringify(articleBlocks),
    });
    trackUsage(fidelityResult.usage);

    console.log(
      `[VoicePipeline] Fidelity score: ${fidelityResult.data.fidelityScore}/100`,
    );

    // Step 5: Standard review (enhanced with fidelity context)
    console.log(`[VoicePipeline] Reviewing article for ${input.voiceId}`);
    const reviewResult = await this.reviewAgent.review({
      title: structured.suggestedTitle,
      blocks: JSON.stringify(articleBlocks),
      revisionNumber: 1,
    });
    trackUsage(reviewResult.usage);

    console.log(
      `[VoicePipeline] Review score: ${reviewResult.data.overallScore}/100, ` +
        `fidelity: ${fidelityResult.data.fidelityScore}/100`,
    );

    return {
      voiceId: input.voiceId,
      tenantId: input.tenantId,
      structuredTranscript: structured,
      articleBlocks,
      fidelityReport: fidelityResult.data,
      gapDetection: gapResult.data,
      reviewReport: reviewResult.data,
      languageCode: input.languageCode,
      suggestedTitle: structured.suggestedTitle,
      totalTokensUsed: totalUsage,
      jobIds,
    };
  }
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch?.[1]) return jsonMatch[1].trim();

  return text.trim();
}
