import { Console } from 'console';
import { getInstallationOctokit } from '../../lib/githubApp.js';
import { logger } from '../../utils/logger.js';
import { GoogleGenAI } from '@google/genai';

export interface AI Code ReviewSuggestionContext {
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  suggestionCode?: string;
  originalComment?: string;
  severity?: string;
  issueType?: string;
}

// Using Vertex AI with @google/genai package for Gemini 2.5-pro model

/**
 * Heuristically determine if a comment body is a AI Code Review Platform suggestion/comment
 */
export function isLikelyAI Code ReviewComment(body: string, authorLogin?: string): boolean {
  // Prefer strict author login matching to identify AI Code Review comments
  if (isAI Code ReviewBotAuthor(authorLogin)) return true;
  if (!body) return false;
  const lowered = body.toLowerCase();
  // Fallback heuristics (kept for legacy comments)
  const hasSuggestionFence = lowered.includes('```suggestion');
  const hasProblemSection = /###\s*problem/i.test(body);
  const hasMetadata = /\*\*File\*\*: `[^`]+`/i.test(body);
  const mentionsAI Code Review = lowered.includes('ai-code-review ai') || lowered.includes('ai-code-review');
  logger.debug('AI Code Review comment detection markers (fallback)', {
    hasSuggestionFence,
    hasProblemSection,
    hasMetadata,
    mentionsAI Code Review,
    authorLogin,
  });
  return hasSuggestionFence || hasProblemSection || hasMetadata || mentionsAI Code Review;
}

export function isAI Code ReviewBotAuthor(authorLogin?: string): boolean {
  if (!authorLogin) return false;
  const login = authorLogin.toLowerCase();
  const configured = (process.env.AI CODE REVIEW_BOT_LOGIN || '').toLowerCase().trim();
  const candidates = [configured, 'ai-code-review[bot]', 'ai-code-review-platform[bot]'].filter(Boolean);
  const match = candidates.includes(login);
  logger.debug('AI Code Review bot author check', { authorLogin, match, configured });
  return match;
}

export function isAI Code ReviewMentioned(body?: string): boolean {
  if (!body) return false;
  const match = /@(ai-code-review-platform|ai-code-review|ai-code-review)\b/i.test(body);
  logger.debug('AI Code Review mention check', { mentioned: match, preview: body.slice(0, 120) });
  return match;
}

/**
 * Determine if a new PR conversation comment is likely a reply to a AI Code Review comment.
 * Heuristics:
 * - Mentions the bot (e.g., @ai-code-review, @ai-code-review) or the word "ai-code-review ai".
 * - Contains a blockquote (>) referencing typical AI Code Review markers or suggestion fences.
 */
export function isLikelyReplyToAI Code ReviewConversation(body: string): boolean {
  if (!body) return false;
  const lowered = body.toLowerCase();
  const hasBotMention = /@ai-code-review[-_]ai|@.*\[bot\]/i.test(body);
  const mentionsAI Code Review = lowered.includes('@ai-code-review');
  const quotesAI Code Review = />\s*.*(ai-code-review|```suggestion|###\s*problem)/i.test(body);
  logger.debug('Issue comment reply intent detection', {
    hasBotMention,
    mentionsAI Code Review,
    quotesAI Code Review,
  });
  return hasBotMention || mentionsAI Code Review || quotesAI Code Review;
}

/**
 * Extracts suggestion metadata from a AI Code Review comment
 */
export function extractSuggestionFromComment(content: string): AI Code ReviewSuggestionContext | null {
  try {
    if (!content || typeof content !== 'string') return null;
    // Extract file path
    const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
    const filePath = fileMatch ? fileMatch[1].trim() : undefined;

    // Extract line numbers
    const lineStartMatch = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
    const lineEndMatch = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
    const lineStart = lineStartMatch ? parseInt(lineStartMatch[1]) : undefined;
    const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1]) : undefined;

    // Extract severity/issue type
    const severityMatch = content.match(/\*\*Severity\*\*:\s*([^\n]+)/);
    const issueTypeMatch = content.match(/\*\*Issue\s*Type\*\*:\s*([^\n]+)/);
    const severity = severityMatch ? severityMatch[1].trim() : undefined;
    const issueType = issueTypeMatch ? issueTypeMatch[1].trim() : undefined;

    // Extract suggestion code block (raw)
    const suggestionMatch = content.match(/```suggestion\s*\n([\s\S]*?)\n```/);
    const suggestionCode = suggestionMatch ? suggestionMatch[1].trim() : undefined;

    const result: AI Code ReviewSuggestionContext = {
      filePath,
      lineStart,
      lineEnd,
      suggestionCode,
      originalComment: content,
      severity,
      issueType,
    };
    logger.debug('Extracted AI Code Review suggestion context', {
      filePath: result.filePath,
      lineStart: result.lineStart,
      lineEnd: result.lineEnd,
      severity: result.severity,
      issueType: result.issueType,
      suggestionCodeLength: result.suggestionCode?.length || 0,
    });
    return result;
  } catch (error) {
    logger.warn('Error extracting suggestion from AI Code Review comment', { error: error instanceof Error ? error.message : error });
    return null;
  }
}

function buildGeminiPrompt(params: {
  repoFullName: string;
  prNumber?: number;
  ai-code-reviewCommentBody: string;
  ai-code-reviewMeta?: AI Code ReviewSuggestionContext | null;
  userReplyBody: string;
  replyAuthorLogin?: string;
  parentPath?: string;
  parentLine?: number;
  diffHunk?: string;
}): string {
  const { repoFullName, prNumber, ai-code-reviewCommentBody, ai-code-reviewMeta, userReplyBody, replyAuthorLogin, parentPath, parentLine, diffHunk } = params;

  const extractedContext = ai-code-reviewMeta
    ? `${ai-code-reviewMeta.filePath ? `File: ${ai-code-reviewMeta.filePath}\n` : ''}` +
      `${typeof ai-code-reviewMeta.lineStart === 'number' ? `Line_Start: ${ai-code-reviewMeta.lineStart}\n` : ''}` +
      `${typeof ai-code-reviewMeta.lineEnd === 'number' ? `Line_End: ${ai-code-reviewMeta.lineEnd}\n` : ''}` +
      `${ai-code-reviewMeta.severity ? `Severity: ${ai-code-reviewMeta.severity}\n` : ''}` +
      `${ai-code-reviewMeta.issueType ? `Issue_Type: ${ai-code-reviewMeta.issueType}\n` : ''}` +
      `${ai-code-reviewMeta.suggestionCode ? `Suggestion:\n\`\`\`\n${ai-code-reviewMeta.suggestionCode}\n\`\`\`\n` : ''}`
    : '';

  const reviewLocation = (parentPath || typeof parentLine === 'number')
    ? `${parentPath ? `Path: ${parentPath}\n` : ''}${typeof parentLine === 'number' ? `Line: ${parentLine}\n` : ''}`
    : '';

  const diffSection = diffHunk
    ? `--- Diff Hunk (context) ---\n\`\`\`diff\n${diffHunk}\n\`\`\`\n`
    : '';

  const prompt = `You are AI Code Review Platform, an AI code reviewer.
You previously commented on this Pull Request, and the user replied with doubts/questions about your comment.
Please read the context carefully and respond with a simple, clear text that resolves the user's query.
You may include concise code suggestions if helpful. Keep the response focused and practical.

Repository: ${repoFullName}${prNumber ? ` | PR #${prNumber}` : ''}

--- AI Code Review Original Comment ---
${ai-code-reviewCommentBody}

${extractedContext ? `--- Extracted Context ---\n${extractedContext}\n` : ''}${reviewLocation ? `--- Review Location ---\n${reviewLocation}\n` : ''}${diffSection}
--- User Reply ---
${userReplyBody}

--- Instruction ---
Understand AI Code Review's original comment and the user's intent in the reply.
Check the referenced code (diff hunks) if it's a review comment.
Start directly with the answer — no greetings, apologies, or filler.
Give the main crux first; keep it crisp and clear.
Respond directly to the user's reply above.
Explain misunderstandings briefly and provide corrective guidance.
Begin your response with '@${replyAuthorLogin ?? 'author'}' followed by the answer.
If a code fix helps, present it inside a collapsible dropdown:
<details><summary>Suggested fix</summary>
\`\`\`suggestion
<replacement snippet for the relevant lines>
\`\`\`
</details>`;

  logger.debug('Built Gemini prompt summary', {
    repoFullName,
    prNumber,
    hasMeta: !!ai-code-reviewMeta,
    promptLength: prompt.length,
    hasSuggestionCode: !!ai-code-reviewMeta?.suggestionCode,
    hasDiffHunk: !!diffHunk,
  });
  return prompt;
}

export async function generateReplyWithGemini(prompt: string, model?: string): Promise<string> {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  const chosenModel = model || 'gemini-2.5-pro';
  
  if (!credentialsPath) {
    logger.warn('GOOGLE_APPLICATION_CREDENTIALS is not set; cannot call Vertex AI.');
    return 'I\'m unable to process your reply right now due to missing configuration. Please try again later.';
  }
  
  if (!projectId) {
    logger.warn('GOOGLE_CLOUD_PROJECT_ID or GCP_PROJECT_ID is not set; cannot call Vertex AI.');
    return 'I\'m unable to process your reply right now due to missing project configuration. Please try again later.';
  }
  
  try {
    logger.info('Calling Vertex AI Gemini SDK generateContent', { 
      model: chosenModel, 
      promptLength: prompt.length,
      projectId,
      location 
    });
    
    // Initialize GoogleGenAI for Vertex AI
    const ai = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: location,
    });
    
    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: prompt,
    });
    
    const text = String((response as any)?.text || '').trim();
    const firstCandidate = (response as any)?.candidates?.[0];
    const finishReason = firstCandidate?.finishReason;
    const safety = firstCandidate?.safetyRatings;
    
    logger.info('Vertex AI Gemini SDK response received', {
      finishReason,
      responseLength: text.length,
      safetyBlocked: Array.isArray(safety) ? safety.some((s: any) => s?.blocked) : false,
    });
    
    return text || 'Missing context; share relevant code or details.';
  } catch (error) {
    logger.error('Vertex AI Gemini SDK call failed', { error: error instanceof Error ? error.message : error });
    return 'I encountered an error while generating a response. Please try again.';
  }
}

export async function respondToAI Code ReviewCommentReply(opts: {
  installationId: number;
  owner: string;
  repo: string;
  prNumber?: number;
  userReplyCommentId: number;
  userReplyBody: string;
  replyAuthorLogin?: string;
  parentCommentId: number;
  parentCommentBody: string;
  parentPath?: string;
  parentLine?: number;
  diffHunk?: string;
  /**
   * Deprecated: commentType is ignored; we now only handle review comment replies.
   */
  commentType?: 'review' | 'issue';
}): Promise<void> {
  try {
    logger.info('Responding to AI Code Review comment reply', {
      installationId: opts.installationId,
      owner: opts.owner,
      repo: opts.repo,
      prNumber: opts.prNumber,
      userReplyCommentId: opts.userReplyCommentId,
      parentCommentId: opts.parentCommentId,
      commentType: 'review',
    });
    const ai-code-reviewMeta = extractSuggestionFromComment(opts.parentCommentBody);
    const prompt = buildGeminiPrompt({
      repoFullName: `${opts.owner}/${opts.repo}`,
      prNumber: opts.prNumber,
      ai-code-reviewCommentBody: opts.parentCommentBody,
      ai-code-reviewMeta,
      userReplyBody: opts.userReplyBody,
      replyAuthorLogin: opts.replyAuthorLogin,
      parentPath: opts.parentPath,
      parentLine: opts.parentLine,
      diffHunk: opts.diffHunk,
    });

    const replyText = await generateReplyWithGemini(prompt);
    logger.debug('AI reply text preview', { preview: replyText.slice(0, 200), length: replyText.length });
    logger.info('AI reply text generated', { length: replyText.length });

    // Skip posting if the AI produced an empty or generic fallback response
    const isGenericOrEmpty = (
      replyText.trim().length < 20 ||
      /^Acknowledged\b/i.test(replyText) ||
      /^Missing context\b/i.test(replyText)
    );
    if (isGenericOrEmpty) {
      logger.warn('AI reply was empty or generic; not posting a comment', {
        preview: replyText.slice(0, 120),
        length: replyText.length,
      });
      return;
    }

    const octokit = getInstallationOctokit(opts.installationId);
    // Ensure the reply starts with an @mention of the replying user
    const mention = opts.replyAuthorLogin ? `@${opts.replyAuthorLogin}` : '';
    const finalReplyBody = (mention && !replyText.trim().startsWith(mention))
      ? `${mention} ${replyText}`
      : replyText;

    // Always post a threaded reply to the review comment.
    logger.debug('Posting threaded reply to review comment', {
      owner: opts.owner,
      repo: opts.repo,
      comment_id: opts.parentCommentId,
      replyLength: finalReplyBody.length,
    });
    try {
      await octokit.pulls.createReplyForReviewComment({
        owner: opts.owner,
        repo: opts.repo,
        pull_number: opts.prNumber!,
        comment_id: opts.parentCommentId,
        body: finalReplyBody,
      });
      logger.info('Posted AI Code Review Platform reply under review comment', {
        owner: opts.owner,
        repo: opts.repo,
        parentCommentId: opts.parentCommentId,
      });
    } catch (err) {
      const status = (err as any)?.status;
      const message = (err as any)?.message || (err as Error)?.message;
      logger.warn('Threaded reply endpoint failed; attempting in_reply_to route', {
        status,
        message,
        owner: opts.owner,
        repo: opts.repo,
        prNumber: opts.prNumber,
        parentCommentId: opts.parentCommentId,
      });
    }
  } catch (error) {
    logger.error('Failed to respond to AI Code Review comment reply', { error: error instanceof Error ? error.message : error });
  }
}