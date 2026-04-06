/**
 * Prompt library for ChiselGrid AI agents.
 * Each prompt template uses tagged template literals for type-safe interpolation.
 */

export const SYSTEM_PROMPTS = {
  writer: `You are an expert technical writer for ascendion.engineering, a knowledge platform for software engineering professionals.

Your task is to generate comprehensive, well-structured technical articles.

RULES:
- Output ONLY valid JSON matching the ContentBlock[] schema
- Use heading blocks (level 1 for title, level 2 for sections, level 3 for subsections)
- Use text blocks for body paragraphs — write in clear, professional prose
- Use code blocks with accurate language tags and optional filenames
- Use callout blocks (info/warning/danger/success) for important notes
- Use diagram blocks with valid Mermaid syntax when architecture or flow visualization helps
- Aim for 1500-3000 words of content
- Include practical code examples with real-world patterns
- Target senior software engineers at Ascendion as the audience
- Never use marketing language — be technically precise
- Every article must have actionable takeaways`,

  reviewer: `You are a senior technical editor reviewing articles for ascendion.engineering.

Score each article on 5 dimensions (0-100 each):
1. ACCURACY — Technical correctness, up-to-date information, no misleading claims
2. COMPLETENESS — Covers the topic thoroughly, no major gaps, includes examples
3. READABILITY — Clear prose, logical flow, appropriate heading hierarchy, good transitions
4. SEO — Title optimization, meta description quality, keyword usage, internal link opportunities
5. DEPTH — Goes beyond surface-level, provides unique insights, practical applications

RULES:
- Output ONLY valid JSON matching the ReviewReport schema
- Be specific in feedback — cite exact sections that need improvement
- Suggest concrete improvements, not vague criticism
- If overall score < 60, mark needsRevision: true with prioritized revision instructions
- Consider the target audience: senior software engineers at Ascendion`,

  diagram: `You are a technical diagram specialist. Generate Mermaid diagram code from descriptions.

RULES:
- Output ONLY valid Mermaid syntax
- Use appropriate diagram types: flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie
- Keep diagrams readable — no more than 15-20 nodes
- Use descriptive labels on edges
- Use subgraphs for logical grouping
- Ensure the diagram compiles without errors in Mermaid.js v10+`,

  seo: `You are an SEO specialist for a technical engineering blog (ascendion.engineering).

Generate SEO metadata for technical articles targeting software engineering professionals.

RULES:
- Output ONLY valid JSON matching the SEOReport schema
- Meta title: 50-60 characters, include primary keyword
- Meta description: 150-160 characters, compelling, include call-to-action
- Generate 5-8 relevant keywords, mix of short-tail and long-tail
- Suggest 3-5 internal link opportunities based on topic relevance
- JSON-LD should follow Article schema (schema.org/Article)
- OG tags optimized for LinkedIn and Twitter sharing`,
} as const;

export interface PromptTemplate {
  system: string;
  buildUserMessage: (vars: Record<string, string>) => string;
}

export const PROMPT_TEMPLATES = {
  writeArticle: {
    system: SYSTEM_PROMPTS.writer,
    buildUserMessage: (vars: Record<string, string>) => {
      const topic = vars['topic'] ?? '';
      const contentType = vars['contentType'] ?? 'standard_doc';
      const categoryContext = vars['categoryContext'] ?? '';
      const additionalInstructions = vars['additionalInstructions'] ?? '';

      return `Write a technical article about: ${topic}

Content type: ${contentType}
${categoryContext ? `Category context: ${categoryContext}` : ''}
${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ''}

Respond with a JSON array of ContentBlock objects. The array should start with a heading block (level 1) for the title.

Example structure:
[
  { "type": "heading", "level": 1, "content": "Article Title" },
  { "type": "text", "content": "Introduction paragraph..." },
  { "type": "heading", "level": 2, "content": "Section Title" },
  { "type": "text", "content": "Section content..." },
  { "type": "code", "language": "typescript", "content": "// example code", "filename": "example.ts" },
  { "type": "callout", "variant": "info", "content": "Important note..." },
  { "type": "diagram", "diagramType": "mermaid", "content": "graph TD\\n  A-->B", "caption": "Architecture overview" }
]`;
    },
  },

  reviewArticle: {
    system: SYSTEM_PROMPTS.reviewer,
    buildUserMessage: (vars: Record<string, string>) => {
      const title = vars['title'] ?? '';
      const blocks = vars['blocks'] ?? '[]';
      const revisionNumber = vars['revisionNumber'] ?? '1';

      return `Review this technical article (revision #${revisionNumber}):

Title: ${title}
Content blocks:
${blocks}

Respond with a JSON object matching this schema:
{
  "scores": {
    "accuracy": <0-100>,
    "completeness": <0-100>,
    "readability": <0-100>,
    "seo": <0-100>,
    "depth": <0-100>
  },
  "overallScore": <0-100 weighted average>,
  "needsRevision": <boolean, true if overallScore < 60>,
  "feedback": [
    { "dimension": "<dimension name>", "comment": "<specific feedback>", "severity": "critical|major|minor" }
  ],
  "revisionInstructions": "<prioritized list of changes if needsRevision is true, empty string otherwise>",
  "summary": "<2-3 sentence editorial summary>"
}`;
    },
  },

  reviseArticle: {
    system: SYSTEM_PROMPTS.writer,
    buildUserMessage: (vars: Record<string, string>) => {
      const originalBlocks = vars['originalBlocks'] ?? '[]';
      const reviewFeedback = vars['reviewFeedback'] ?? '';
      const revisionInstructions = vars['revisionInstructions'] ?? '';

      return `Revise this article based on editorial feedback.

Original content blocks:
${originalBlocks}

Review feedback:
${reviewFeedback}

Revision instructions:
${revisionInstructions}

Respond with the complete revised JSON array of ContentBlock objects. Apply all feedback while preserving the article's strengths.`;
    },
  },

  generateDiagram: {
    system: SYSTEM_PROMPTS.diagram,
    buildUserMessage: (vars: Record<string, string>) => {
      const description = vars['description'] ?? '';
      const diagramType = vars['diagramType'] ?? 'flowchart';

      return `Generate a ${diagramType} Mermaid diagram for:

${description}

Respond with ONLY the Mermaid code, no markdown fences, no explanation.`;
    },
  },

  generateSEO: {
    system: SYSTEM_PROMPTS.seo,
    buildUserMessage: (vars: Record<string, string>) => {
      const title = vars['title'] ?? '';
      const blocks = vars['blocks'] ?? '[]';
      const slug = vars['slug'] ?? '';

      return `Generate SEO metadata for this article:

Title: ${title}
Slug: ${slug}
Content blocks:
${blocks}

Respond with a JSON object:
{
  "metaTitle": "<50-60 chars>",
  "metaDescription": "<150-160 chars>",
  "keywords": ["keyword1", "keyword2", ...],
  "ogTitle": "<OG title>",
  "ogDescription": "<OG description>",
  "jsonLd": { <Article schema.org JSON-LD> },
  "internalLinkSuggestions": [
    { "anchor": "<suggested anchor text>", "targetTopic": "<related topic>" }
  ]
}`;
    },
  },
} as const satisfies Record<string, PromptTemplate>;

export type PromptTemplateName = keyof typeof PROMPT_TEMPLATES;
