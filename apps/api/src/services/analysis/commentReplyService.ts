import { getInstallationOctokit } from '../../lib/githubApp.js';
import { logger } from '../../utils/logger.js';
import Feedback from '../../models/feedback.model.js';
import { generateWithGemini } from '../../utils/gemini.helper.js';
import { getBitbucketAccessToken } from '../../utils/bitbucketTokenManager.js';

export interface AiCodeReviewSuggestionContext {
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
export function isLikelyAiCodeReviewComment(body: string, authorLogin?: string): boolean {
  // Prefer strict author login matching to identify AI Code Review comments
  if (isAiCodeReviewBotAuthor(authorLogin)) return true;
  if (!body) return false;
  const lowered = body.toLowerCase();
  // Fallback heuristics (kept for legacy comments)
  const hasSuggestionFence = lowered.includes('```suggestion');
  const hasProblemSection = /###\s*problem/i.test(body);
  const hasMetadata = /\*\*File\*\*: `[^`]+`/i.test(body);
  const mentionsAiCodeReview = lowered.includes('ai-code-review ai') || lowered.includes('ai-code-review');
  logger.debug('AI Code Review comment detection markers (fallback)', {
    hasSuggestionFence,
    hasProblemSection,
    hasMetadata,
    mentionsAiCodeReview,
    authorLogin,
  });
  return hasSuggestionFence || hasProblemSection || hasMetadata || mentionsAiCodeReview;
}

export function isAiCodeReviewBotAuthor(authorLogin?: string): boolean {
  if (!authorLogin) return false;
  const login = authorLogin.toLowerCase();
  const configured = (process.env.AI_CODE_REVIEW_BOT_LOGIN || '').toLowerCase().trim();
  const candidates = [configured, 'ai-code-review[bot]', 'ai-code-reviews-ai[bot]'].filter(Boolean);
  const match = candidates.includes(login);
  logger.debug('AI Code Review bot author check', { authorLogin, match, configured });
  return match;
}

export function isAiCodeReviewMentioned(body?: string): boolean {
  if (!body) return false;
  const match = /@(ai-code-reviews-ai|ai-code-review|ai-code-review)\b/i.test(body);
  logger.debug('AI Code Review mention check', { mentioned: match, preview: body.slice(0, 120) });
  return match;
}

/**
 * Determine if a new PR conversation comment is likely a reply to a AI Code Review comment.
 * Heuristics:
 * - Mentions the bot (e.g., @ai-code-review, @ai-code-review) or the word "ai-code-review ai".
 * - Contains a blockquote (>) referencing typical AI Code Review markers or suggestion fences.
 */
export function isLikelyReplyToAiCodeReviewConversation(body: string): boolean {
  if (!body) return false;
  const lowered = body.toLowerCase();
  const hasBotMention = /@ai-code-review[-_]ai|@.*\[bot\]/i.test(body);
  const mentionsAiCodeReview = lowered.includes('@ai-code-review');
  const quotesAiCodeReview = />\s*.*(ai-code-review|```suggestion|###\s*problem)/i.test(body);
  logger.debug('Issue comment reply intent detection', {
    hasBotMention,
    mentionsAiCodeReview,
    quotesAiCodeReview,
  });
  return hasBotMention || mentionsAiCodeReview || quotesAiCodeReview;
}

/**
 * Extracts suggestion metadata from a AI Code Review comment
 */
export type ReplyIntent = 'QUESTION' | 'FEEDBACK' | 'SUGGESTION' | 'DISCUSSION';

/**
 * Parse the reply intent classification from the AI response
 */
export function parseReplyClassification(aiResponse: string): ReplyIntent | null {
  const intentMatch = aiResponse.match(/\[INTENT:\s*(QUESTION|FEEDBACK|SUGGESTION|DISCUSSION)\]/i);
  if (intentMatch) {
    const intent = intentMatch[1].toUpperCase() as ReplyIntent;
    logger.debug('Parsed reply intent from AI response', { intent });
    return intent;
  }
  logger.debug('No intent classification found in AI response');
  return null;
}



/**
 * Save user feedback to database
 */
export async function saveFeedbackToDatabase(params: {
  userId: string;
  teamId?: string;
  owner: string;
  repo: string;
  prNumber: number;
  commentId: number;
  userReplyText: string;
  intent: ReplyIntent;
  originalCommentBody: string;
  parentPath?: string;
  parentLine?: number;
  diffHunk?: string;
}): Promise<void> {
  try {
    const { userId, teamId, owner, repo, prNumber, commentId, userReplyText, intent, originalCommentBody, parentPath, parentLine, diffHunk } = params;
    
    const repoUrl = `https://github.com/${owner}/${repo}`;
    
    // Map intent to feedback type (suggestions are positive, feedback depends on sentiment)
    // For now, treat suggestions as positive and feedback as negative by default
    const feedbackType: 'positive' | 'negative' = intent === 'SUGGESTION' ? 'positive' : 'negative';
    
    const feedbackDoc = new Feedback({
      userId,
      teamId,
      repoOwner: owner,
      repoName: repo,
      repoUrl,
      prNumber,
      commentId,
      feedbackType,
      feedbackContent: userReplyText,
      replyType: 'text-reply',
      originalCommentContext: {
        body: originalCommentBody,
        path: parentPath,
        line: parentLine,
        diffHunk,
      },
    });
    
    await feedbackDoc.save();
    logger.info('Saved user feedback to database', {
      userId,
      owner,
      repo,
      prNumber,
      commentId,
      intent,
      feedbackType,
    });
  } catch (error) {
    logger.error('Failed to save feedback to database', {
      error: error instanceof Error ? error.message : error,
      owner: params.owner,
      repo: params.repo,
      prNumber: params.prNumber,
    });
  }
}

/**
 * Extracts suggestion metadata from a AI Code Review comment
 */
export function extractSuggestionFromComment(content: string): AiCodeReviewSuggestionContext | null {
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

    const result: AiCodeReviewSuggestionContext = {
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
  aiCodeReviewCommentBody: string;
  aiCodeReviewMeta?: AiCodeReviewSuggestionContext | null;
  userReplyBody: string;
  replyAuthorLogin?: string;
  parentPath?: string;
  parentLine?: number;
  diffHunk?: string;
}): string {
  const { repoFullName, prNumber, aiCodeReviewCommentBody, aiCodeReviewMeta, userReplyBody, replyAuthorLogin, parentPath, parentLine, diffHunk } = params;

  const extractedContext = aiCodeReviewMeta
    ? `${aiCodeReviewMeta.filePath ? `File: ${aiCodeReviewMeta.filePath}\n` : ''}` +
      `${typeof aiCodeReviewMeta.lineStart === 'number' ? `Line_Start: ${aiCodeReviewMeta.lineStart}\n` : ''}` +
      `${typeof aiCodeReviewMeta.lineEnd === 'number' ? `Line_End: ${aiCodeReviewMeta.lineEnd}\n` : ''}` +
      `${aiCodeReviewMeta.severity ? `Severity: ${aiCodeReviewMeta.severity}\n` : ''}` +
      `${aiCodeReviewMeta.issueType ? `Issue_Type: ${aiCodeReviewMeta.issueType}\n` : ''}` +
      `${aiCodeReviewMeta.suggestionCode ? `Suggestion:\n\`\`\`\n${aiCodeReviewMeta.suggestionCode}\n\`\`\`\n` : ''}`
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
${aiCodeReviewCommentBody}

${extractedContext ? `--- Extracted Context ---\n${extractedContext}\n` : ''}${reviewLocation ? `--- Review Location ---\n${reviewLocation}\n` : ''}${diffSection}
--- User Reply ---
${userReplyBody}

--- Instruction ---
FIRST, classify the user's reply intent. Start your response with ONE of these tags:
- [INTENT: QUESTION] - if the user is asking a question or seeking clarification
- [INTENT: DISCUSSION] - if the user wants to discuss the approach or have a conversation
- [INTENT: FEEDBACK] - if the user is reporting that something didn't work or providing negative feedback
- [INTENT: SUGGESTION] - if the user is offering a suggestion or alternative approach

THEN, craft your response based on the intent:
- For QUESTION or DISCUSSION: Answer directly without acknowledgment
- For FEEDBACK: Start with a brief acknowledgment using an emoji like ✍️, 📝, or similar, followed by your response to their feedback
- For SUGGESTION: Start with a brief appreciation using an emoji like 💡, 🙏, or similar, followed by your response to their suggestion

The acknowledgment should be natural and contextual to what the user said, not generic. Examples:
- FEEDBACK: "Taking note of this! ✍️" or "Noted, thanks for the feedback! 📝"
- SUGGESTION: "Great idea! 💡" or "Thanks for the suggestion! 🙏"

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
    hasMeta: !!aiCodeReviewMeta,
    promptLength: prompt.length,
    hasSuggestionCode: !!aiCodeReviewMeta?.suggestionCode,
    hasDiffHunk: !!diffHunk,
  });
  return prompt;
}

export async function generateReplyWithGemini(prompt: string, model?: string): Promise<string> {
  try {
    const text = await generateWithGemini(prompt, model);
    return text || 'Missing context; share relevant code or details.';
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('generateReplyWithGemini failed', { error: errorMsg });
    
    // Return user-friendly messages for configuration errors
    if (errorMsg.includes('Missing Vertex AI configuration')) {
      return 'I\'m unable to process your reply right now due to missing configuration. Please try again later.';
    }
    if (errorMsg.includes('Missing project configuration')) {
      return 'I\'m unable to process your reply right now due to missing project configuration. Please try again later.';
    }
    return 'I encountered an error while generating a response. Please try again.';
  }
}

export async function respondToAiCodeReviewCommentReply(opts: {
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
    const aiCodeReviewMeta = extractSuggestionFromComment(opts.parentCommentBody);
    const prompt = buildGeminiPrompt({
      repoFullName: `${opts.owner}/${opts.repo}`,
      prNumber: opts.prNumber,
      aiCodeReviewCommentBody: opts.parentCommentBody,
      aiCodeReviewMeta,
      userReplyBody: opts.userReplyBody,
      replyAuthorLogin: opts.replyAuthorLogin,
      parentPath: opts.parentPath,
      parentLine: opts.parentLine,
      diffHunk: opts.diffHunk,
    });

    const replyText = await generateReplyWithGemini(prompt);
    logger.debug('AI reply text preview', { preview: replyText.slice(0, 200), length: replyText.length });
    logger.info('AI reply text generated', { length: replyText.length });

    // Parse the reply classification
    const intent = parseReplyClassification(replyText);
    logger.info('Parsed reply intent', { intent });

    // Check if this is feedback or suggestion
    const isFeedbackOrSuggestion = intent === 'FEEDBACK' || intent === 'SUGGESTION';
    
    // Save to database if it's feedback or suggestion
    if (isFeedbackOrSuggestion && intent && opts.replyAuthorLogin) {
      await saveFeedbackToDatabase({
        userId: opts.replyAuthorLogin,
        teamId: undefined, // teamId is optional
        owner: opts.owner,
        repo: opts.repo,
        prNumber: opts.prNumber || 0,
        commentId: opts.parentCommentId,
        userReplyText: opts.userReplyBody,
        intent,
        originalCommentBody: opts.parentCommentBody,
        parentPath: opts.parentPath,
        parentLine: opts.parentLine,
        diffHunk: opts.diffHunk,
      });
    }

    // Remove the [INTENT: ...] tag from the reply text
    let cleanedReplyText = replyText.replace(/\[INTENT:\s*(QUESTION|FEEDBACK|SUGGESTION|DISCUSSION)\]\s*/i, '').trim();

    // Skip posting if the AI produced an empty or generic fallback response
    const isGenericOrEmpty = (
      cleanedReplyText.trim().length < 20 ||
      /^Acknowledged\b/i.test(cleanedReplyText) ||
      /^Missing context\b/i.test(cleanedReplyText)
    );
    if (isGenericOrEmpty) {
      logger.warn('AI reply was empty or generic; not posting a comment', {
        preview: cleanedReplyText.slice(0, 120),
        length: cleanedReplyText.length,
      });
      return;
    }

    const octokit = getInstallationOctokit(opts.installationId);
    // Ensure the reply starts with an @mention of the replying user
    const mention = opts.replyAuthorLogin ? `@${opts.replyAuthorLogin}` : '';
    
    // The AI now generates acknowledgments directly for feedback/suggestions
    let finalReplyBody = cleanedReplyText;
    
    // Ensure mention is present
    if (mention && !finalReplyBody.trim().startsWith(mention)) {
      finalReplyBody = `${mention} ${finalReplyBody}`;
    }

    // Always post a threaded reply to the review comment.
    logger.debug('Posting threaded reply to review comment', {
      owner: opts.owner,
      repo: opts.repo,
      comment_id: opts.parentCommentId,
      replyLength: finalReplyBody.length,
      intent,
      isFeedbackOrSuggestion,
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
        intent,
        savedFeedback: isFeedbackOrSuggestion,
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

export async function respondToBitbucketAiCodeReviewCommentReply(opts: {
  workspaceSlug: string;
  repoSlug: string;
  prId: number;
  userReplyCommentId: number;
  userReplyBody: string;
  replyAuthorLogin?: string;
  parentCommentId: number;
  parentCommentBody: string;
  parentPath?: string;
  parentLine?: number;
}): Promise<void> {
  try {
    const { workspaceSlug, repoSlug, prId, userReplyCommentId, userReplyBody, replyAuthorLogin, parentCommentId, parentCommentBody, parentPath, parentLine } = opts;
    
    logger.info('Responding to Bitbucket AI Code Review comment reply', {
      workspaceSlug,
      repoSlug,
      prId,
      userReplyCommentId,
      parentCommentId,
    });

    const aiCodeReviewMeta = extractSuggestionFromComment(parentCommentBody);
    const repoFullName = `${workspaceSlug}/${repoSlug}`;
    
    const prompt = buildGeminiPrompt({
      repoFullName,
      prNumber: prId,
      aiCodeReviewCommentBody: parentCommentBody,
      aiCodeReviewMeta,
      userReplyBody,
      replyAuthorLogin,
      parentPath,
      parentLine,
      // diffHunk is harder to get in Bitbucket webhook easily without extra fetch, skipping for now
    });

    const replyText = await generateReplyWithGemini(prompt, "bitbucket"); // Identifying source for logging if needed
    
    // Parse the reply classification
    const intent = parseReplyClassification(replyText);
    const isFeedbackOrSuggestion = intent === 'FEEDBACK' || intent === 'SUGGESTION';

    if (isFeedbackOrSuggestion && intent && replyAuthorLogin) {
      // Reuse saveFeedbackToDatabase? 
      // It expects owner, repo, prNumber.
      // owner = workspaceSlug.
      await saveFeedbackToDatabase({
        userId: replyAuthorLogin,
        teamId: undefined,
        owner: workspaceSlug,
        repo: repoSlug,
        prNumber: prId,
        commentId: parentCommentId,
        userReplyText: userReplyBody,
        intent,
        originalCommentBody: parentCommentBody,
        parentPath,
        parentLine,
      });
    }

    let cleanedReplyText = replyText.replace(/\[INTENT:\s*(QUESTION|FEEDBACK|SUGGESTION|DISCUSSION)\]\s*/i, '').trim();
    
    const isGenericOrEmpty = (
      cleanedReplyText.trim().length < 20 ||
      /^Acknowledged\b/i.test(cleanedReplyText) ||
      /^Missing context\b/i.test(cleanedReplyText)
    );
     if (isGenericOrEmpty) {
      logger.warn('AI reply was empty or generic; not posting a comment', {
        preview: cleanedReplyText.slice(0, 120),
        length: cleanedReplyText.length,
      });
      return;
    }

    // Get Bitbucket Token
    const tokenResult = await getBitbucketAccessToken(workspaceSlug);
    if (!tokenResult.success || !tokenResult.accessToken) {
       throw new Error(`Failed to get Bitbucket token: ${tokenResult.error}`);
    }
    const token = tokenResult.accessToken;

    const mention = replyAuthorLogin ? `@${replyAuthorLogin}` : '';
     if (mention && !cleanedReplyText.trim().startsWith(mention)) {
      cleanedReplyText = `${mention} ${cleanedReplyText}`;
    }

    // Post Reply
    const url = `https://api.bitbucket.org/2.0/repositories/${workspaceSlug}/${repoSlug}/pullrequests/${prId}/comments`;
    const payload = {
        content: {
            raw: cleanedReplyText
        },
        parent: {
            id: parentCommentId
        }
    };

    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to post reply to Bitbucket: ${resp.status} ${errText}`);
    }

    logger.info('Posted AI Code Review Platform reply to Bitbucket comment', {
        workspaceSlug,
        repoSlug,
        parentCommentId,
        intent
    });

  } catch (error) {
    logger.error('Error responding to Bitbucket AI Code Review comment reply', { error: error instanceof Error ? error.message : error });
  }
}