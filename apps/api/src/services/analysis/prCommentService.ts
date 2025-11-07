// apps/api/src/services/prCommentService.ts
import { getInstallationOctokit } from '../../lib/githubApp.js';
import { PRComment } from '../../utils/responseParser.js';

export interface PRCommentContext {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha?: string;
  filesChanged?: string[]; // optional list of filenames (and previous filenames) from PR
}

export interface ParsedSuggestion {
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  suggestionCode?: string;
  originalComment: string;
  severity?: string;
  issueType?: string;
}

export class PRCommentService {
  private context: PRCommentContext;
  private octokit: ReturnType<typeof getInstallationOctokit>;
  private postedComments: Set<string> = new Set();
  private filesInPR?: Set<string>;
  private statusCommentId?: number;
  private static STATUS_MARKER = '<!-- ai-code-review:main-comment -->';

  constructor(context: PRCommentContext) {
    this.context = context;
    this.octokit = getInstallationOctokit(context.installationId);
    if (Array.isArray(context.filesChanged) && context.filesChanged.length > 0) {
      // Normalize and store filenames for quick membership checks
      this.filesInPR = new Set(
        context.filesChanged
          .filter(Boolean)
          .map((p) => p.trim().replace(/^\.\//, ''))
      );
    }
  }

  /**
   * Check if a given file path is part of the current PR changes
   * Includes support for renamed files via previous_filename
   */
  private async isFileInPR(filePath: string): Promise<boolean> {
    try {
      const normalizedPath = filePath.trim().replace(/^\.\//, '');

      // Prefer provided files list if available
      console.log("🔍 Files in PR Set: ", Array.from(this.filesInPR || []));
      console.log(`[PR-${this.context.pullNumber}] 🔎 Checking provided filesChanged list for: "${normalizedPath}"`);
      const isFileInPR = this.filesInPR?.has(normalizedPath) || false;
      console.log(`[PR-${this.context.pullNumber}] 🔍 Is file in PR: ${isFileInPR}`);
      
      // Additional debug: check if there's a partial match
      if (!isFileInPR && this.filesInPR) {
        const matchingFiles = Array.from(this.filesInPR).filter(f => f.includes(normalizedPath) || normalizedPath.includes(f));
        if (matchingFiles.length > 0) {
          console.log(`[PR-${this.context.pullNumber}] ⚠️ Found similar files:`, matchingFiles);
        }
      }
      
      return isFileInPR;
   
    } catch (e) {
      console.error(`[PR-${this.context.pullNumber}] Failed to list PR files for validation:`, e);
      return false;
    }
  }

  /**
   * Comprehensive method to process comment content for GitHub posting
   * Handles both metadata removal and line number annotation cleaning
   */
  private processCommentForGitHub(content: string, suggestionCode?: string): string {
    // Step 1: Remove the header section with metadata (everything before "### Problem")
    const problemMatch = content.match(/(### Problem[\s\S]*)/);
    let processedContent = problemMatch ? problemMatch[1] : content;
    
    // Step 2: Remove any remaining metadata lines that might appear anywhere
    processedContent = processedContent.replace(/^(\*\*(File|Line_Start|Line_End|Severity)\*\*:.*|##\s*\[.*?\]:.*)$/gm, '');
    
    // Step 3: Remove line number annotations from ALL code blocks (not just suggestion blocks)
    processedContent = processedContent.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/^\s*\d+\|\s*/gm, '');
    });
    
    // Step 4: If we have suggestion code, clean it and replace the suggestion block content
    if (suggestionCode) {
      const cleanSuggestionCode = suggestionCode.replace(/^\s*\d+\|\s*/gm, '').trim();
      processedContent = processedContent.replace(
        /```suggestion\s*\n([\s\S]*?)\n```/,
        '```suggestion\n' + cleanSuggestionCode + '\n```'
      );
    }

    // Step 4.5: Ensure a blank line between </summary> and the ```suggestion code block inside <details>
    // Some comments may have the suggestion block immediately after </summary> without a blank line.
    // Normalize it to have exactly one blank line to render properly in GitHub.
    processedContent = processedContent.replace(
      /(<details>[\s\S]*?<summary>[\s\S]*?<\/summary>)(\s*)(```suggestion)/g,
      '$1\n\n$3'
    );
    
    // Step 5: Clean up any extra whitespace
    processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    // Step 6: Normalize Markdown tables only (disable mermaid/HTML/code-fence auto-fixes)
    processedContent = this.fixMarkdownTables(processedContent);

    return processedContent;
  }



  /**
   * Parse PR comment format to extract suggestion data
   */
  private parseSuggestionComment(content: string): ParsedSuggestion | null {
    try {
      // Extract file path
      const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
      if (!fileMatch) return null;
      
      const filePath = fileMatch[1].trim();
      
      // Extract line numbers
      const lineStartMatch = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
      const lineEndMatch = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
      
      if (!lineStartMatch) return null;
      
      const lineStart = parseInt(lineStartMatch[1]);
      const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1]) : undefined;
      
      // Extract suggestion code if present (raw - will be cleaned later by processCommentForGitHub)
      const suggestionMatch = content.match(/```suggestion\s*\n([\s\S]*?)\n```/);
      const suggestionCode = suggestionMatch ? suggestionMatch[1].trim() : undefined;
      

      
      return {
        filePath,
        lineStart,
        lineEnd,
        suggestionCode,
        originalComment: content,
      };
    } catch (error) {
      console.error('Error parsing suggestion comment:', error);
      return null;
    }
  }

  /**
   * Post a review comment with suggestion on the PR
   */
  async postReviewComment(suggestion: ParsedSuggestion): Promise<boolean> {
    try {
      if (!this.context.commitSha) {
        console.error(`[PR-${this.context.pullNumber}] ❌ No commit SHA provided for review comment`);
        return false;
      }

      // Validate that the path exists in the PR; otherwise the API returns 422
      const pathInPR = await this.isFileInPR(suggestion.filePath);
      if (!pathInPR) {
        console.warn(
          `[PR-${this.context.pullNumber}] ⚠️ File path not found in PR changes: ${suggestion.filePath}. Falling back to regular comment.`
        );
        return false;
      }

      // Process the comment comprehensively for GitHub posting
      let reviewBody = this.processCommentForGitHub(suggestion.originalComment, suggestion.suggestionCode);

      // Add line range information for multi-line suggestions
      if (suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart) {
        const lineRangeInfo = `\n\n*📍 This suggestion applies to lines ${suggestion.lineStart}-${suggestion.lineEnd}*`;
        reviewBody = reviewBody + lineRangeInfo;
      }


      // Prepare the review comment parameters
      const reviewCommentParams: any = {
        owner: this.context.owner,
        repo: this.context.repo,
        pull_number: this.context.pullNumber,
        body: reviewBody,
        commit_id: this.context.commitSha,
        path: suggestion.filePath,
        side: 'RIGHT',
        line: suggestion.lineEnd || suggestion.lineStart
      };

      console.log("🔄 Review comment params: ", reviewCommentParams);

      // If we have both lineStart and lineEnd, and they're different, use multi-line comment
      if (suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart) {
        reviewCommentParams.start_line = suggestion.lineStart;
        reviewCommentParams.start_side = 'RIGHT';
        console.log(`[PR-${this.context.pullNumber}] Creating multi-line comment from line ${suggestion.lineStart} to ${suggestion.lineEnd}`);
      } else {
        console.log(`[PR-${this.context.pullNumber}] Creating single-line comment at line ${suggestion.lineStart}`);
      }

      const response = await this.octokit.pulls.createReviewComment(reviewCommentParams);

      console.log(`[PR-${this.context.pullNumber}] ✅ Posted review comment with suggestion: ${response.data.html_url}`);
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post review comment:`, error);
      // Fallback to regular comment if review comment fails
      return false;
    }
  }

  /**
   * Post a comment on the PR
   */
  async postComment(comment: PRComment): Promise<boolean> {
    try {
      // Create a hash of the comment content to avoid duplicates
      const commentHash = this.createCommentHash(comment.content);
      
      if (this.postedComments.has(commentHash)) {
        console.log(`[PR-${this.context.pullNumber}] Skipping duplicate comment`);
        return false;
      }

      // Summary comments: update the initial AI Code Review status comment instead of posting a new one
      const trimmed = comment.content.trim();
      if (trimmed.startsWith('## Summary by AI Code Review')) {
        console.log("🔄 Updating AI Code Review status comment with summary content");
        const updated = await this.updateStatusCommentWithSummary(comment.content);
        if (updated) {
          this.postedComments.add(commentHash);
          return true;
        }
        console.log(`[PR-${this.context.pullNumber}] ❌ Failed to update status comment; not posting duplicate summary`);
        return false;
      }

      // Check if this is a suggestion comment
      const suggestion = this.parseSuggestionComment(comment.content);
      
      console.log("🔄 Suggestion: ", suggestion);
      if (suggestion) {
        console.log("🔄 Posting review comment with suggestion");
        // Try to post as a review comment with suggestion
        const reviewSuccess = await this.postReviewComment(suggestion);
        
        if (reviewSuccess) {
          this.postedComments.add(commentHash);
          return true;
        }
        
        console.log(`[PR-${this.context.pullNumber}] ❌ Review comment failed`);
        return false;
      }

      console.log(`[PR-${this.context.pullNumber}] ❌ No valid suggestion found in comment; not posting regular comment`);
      return false;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post comment:`, error);
      return false;
    }
  }

  /**
   * Post multiple comments in sequence
   */
  async postComments(comments: PRComment[]): Promise<number> {
    let successCount = 0;
    
    for (const comment of comments) {
      const success = await this.postComment(comment);
      if (success) {
        successCount++;
        // Add a small delay between comments to avoid rate limiting
        await this.delay(1000);
      }
    }
    
    return successCount;
  }



  /**
   * Post an analysis error comment
   */
  async postAnalysisErrorComment(error: string): Promise<boolean> {
    const comment: PRComment = {
      content: `❌ **CodeDetector Analysis Error**\n\nI encountered an error while analyzing this pull request:\n\n\`\`\`\n${error}\n\`\`\`\n\nPlease try again or contact support if the issue persists.`,
      timestamp: new Date().toISOString()
    };
    
    return this.postComment(comment);
  }

  private createCommentHash(content: string): string {
    // Simple hash function to detect duplicate comments
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the posted comments cache (useful for testing)
   */
  clearCache(): void {
    this.postedComments.clear();
  }

  /**
   * Attempt to normalize Markdown tables: ensure header separator, consistent column counts, and pipe boundaries.
   */
  private fixMarkdownTables(content: string): string {
    const lines = content.split('\n');
    let inCode = false;
    const result: string[] = [];
    let tableBuffer: string[] = [];

    const isFence = (l: string) => l.trim().startsWith('```');
    const isTableRow = (l: string) => {
      const s = l.trim();
      if (!s.includes('|')) return false;
      if (s.startsWith('<details>') || s.startsWith('</details>')) return false;
      return true;
    };
    const splitRow = (row: string) => {
      let r = row.trim();
      if (r.startsWith('|')) r = r.slice(1);
      if (r.endsWith('|')) r = r.slice(0, -1);
      return r.split('|');
    };
    const separatorForCols = (n: number) => '|' + new Array(n).fill(' --- ').join('|') + '|';
    const isSeparatorRow = (l: string) => {
      const s = l.trim();
      if (!s.includes('|')) return false;
      return s.replace(/[|:\-\s]/g, '').length === 0;
    };
    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      const header = tableBuffer[0];
      const colCount = Math.max(...tableBuffer.map((r) => splitRow(r).length));
      // Ensure we have a separator row
      if (tableBuffer.length < 2 || !isSeparatorRow(tableBuffer[1])) {
        tableBuffer.splice(1, 0, separatorForCols(colCount));
      } else {
        tableBuffer[1] = separatorForCols(colCount);
      }
      const fixed = tableBuffer.map((row, idx) => {
        if (idx === 1) return separatorForCols(colCount);
        const cells = splitRow(row).map((c) => c.trim());
        const padded = cells.slice(0, colCount);
        while (padded.length < colCount) padded.push('');
        return '| ' + padded.join(' | ') + ' |';
      });
      result.push(...fixed);
      tableBuffer = [];
    };

    for (const line of lines) {
      if (isFence(line)) {
        if (!inCode) flushTable();
        inCode = !inCode;
        result.push(line);
        continue;
      }
      if (inCode) {
        result.push(line);
        continue;
      }
      if (isTableRow(line)) {
        tableBuffer.push(line);
      } else {
        flushTable();
        result.push(line);
      }
    }
    flushTable();
    return result.join('\n');
  }


  /**
   * Create a friendly, immediately visible status comment indicating analysis started.
   * Includes collapsible sections for commits and files.
   */
  async postAnalysisStartedComment(commits?: any[], files?: any[]): Promise<boolean> {
    try {
      // Always create a fresh status comment for each analysis run

      const commitItems = (commits || []).slice(0, 20).map((c: any) => {
        const shortSha = (c?.sha || '').slice(0, 7);
        const msg = (c?.message || '').split('\n')[0];
        const author = c?.author?.name || c?.author?.login || '';
        const url = c?.url || `https://github.com/${this.context.owner}/${this.context.repo}/commit/${c?.sha}`;
        return `- [\`${shortSha}\`](${url}) — ${msg}${author ? ` (${author})` : ''}`;
      }).join('\n');

      const fileItems = (files || []).slice(0, 30).map((f: any) => {
        const name = f?.filename || f;
        const status = f?.status ? ` — ${f.status}` : '';
        const stats = (f?.additions || f?.deletions) ? ` (+${f?.additions || 0}/−${f?.deletions || 0})` : '';
        return `- \`${name}\`${status}${stats}`;
      }).join('\n');

      const commitsCount = (commits || []).length;
      const filesCount = (files || []).length;

      const body = [
        PRCommentService.STATUS_MARKER,
        `## 🪲 AI Code Review Platform is reviewing this PR — Let’s see what you’ve done!`,
        `Under Review`,
        `<details>\n<summary>Commits (${commitsCount})</summary>\n\n${commitItems || '- No commits found'}\n\n</details>`,
        '',
        `<details>\n<summary>Files Changed (${filesCount})</summary>\n\n${fileItems || '- No files found'}\n\n</details>`,
        '',
        `\`Step aside — I’m tearing through this PR 😈 -- You keep on building\``,
        '',
        '---',
        `Links: [AI Code Review](https://ai-code-review-platform.dev) · [X](https://x.com/ai-code-reviewai_dev) · [LinkedIn](https://www.linkedin.com/company/ai-code-review)`,
      ].join('\n');

      const response = await this.octokit.issues.createComment({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        body,
      });

      this.statusCommentId = response.data.id;
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post analysis started comment:`, error);
      return false;
    }
  }

  /**
   * Find the existing AI Code Review status/main comment on the PR by hidden marker.
   */
  private async findExistingStatusCommentId(): Promise<number | undefined> {
    try {
      const res = await this.octokit.issues.listComments({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        per_page: 100,
      });
      const found = res.data.find((c: any) => typeof c?.body === 'string' && c.body.includes(PRCommentService.STATUS_MARKER));
      return found?.id;
    } catch (err) {
      console.warn(`[PR-${this.context.pullNumber}] ⚠️ Failed to list comments to find status comment`, err);
      return undefined;
    }
  }

  /**
   * Update the AI Code Review status comment with the provided summary content.
   * If the status comment is not found, falls back to posting a new summary comment.
   */
  private async updateStatusCommentWithSummary(summaryContent: string): Promise<boolean> {
    try {
      // Clean summary for GitHub rendering
      const processed = this.processCommentForGitHub(summaryContent);
      const updatedBody = `${PRCommentService.STATUS_MARKER}\n${processed}`;

      const commentId = this.statusCommentId;
      if (!commentId) {
        // Fallback – create as new comment
        const response = await this.octokit.issues.createComment({
          owner: this.context.owner,
          repo: this.context.repo,
          issue_number: this.context.pullNumber,
          body: updatedBody,
        });
        this.statusCommentId = response.data.id;
        console.log(`[PR-${this.context.pullNumber}] ✅ Posted new summary comment (no prior status found): ${response.data.html_url}`);
        return true;
      }

      const response = await this.octokit.issues.updateComment({
        owner: this.context.owner,
        repo: this.context.repo,
        comment_id: commentId,
        body: updatedBody,
      });
      console.log(`[PR-${this.context.pullNumber}] ✅ Updated status comment with summary: ${response.data.html_url}`);
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to update status comment with summary:`, error);
      return false;
    }
  }
}