import { promisify } from "util";
import { gzip } from "zlib";
import redis from "../config/redis.js";
import Analysis from "../models/analysis.model.js";

const gzipAsync = promisify(gzip);

export function getAnalysisRedisKey(_id: string): string {
  return `analysis:${_id}:buffer`;
}

// Simple counter key to track number of PR comments posted during an analysis
export function getAnalysisCommentsKey(_id: string): string {
  return `analysis:${_id}:comments_count`;
}

export async function initRedisBuffer(_id: string, ttlSeconds = 60 * 60 * 4): Promise<void> {
  const key = getAnalysisRedisKey(_id);
  // Initialize with empty string and TTL so abandoned runs are cleaned up
  await redis.set(key, "", "EX", ttlSeconds);
  // console.log(`[Redis][init] key=${key} ttl=${ttlSeconds}s`);
}

export async function appendToRedisBuffer(_id: string, data: string): Promise<void> {
  const key = getAnalysisRedisKey(_id);
  // Always append a trailing newline to preserve line boundaries
  const payload = data.endsWith("\n") ? data : data + "\n";
  const appendedLen = Buffer.byteLength(payload);
  await redis.append(key, payload);
  // console.log(`[Redis][append] key=${key} bytes+=${appendedLen}`);
}

/**
 * Initialize the PR comments counter with TTL so abandoned runs are auto-cleaned.
 * Safe to call even if increments happen without initialization.
 */
export async function initAnalysisCommentCounter(_id: string, ttlSeconds = 60 * 60 * 4): Promise<void> {
  const key = getAnalysisCommentsKey(_id);
  // Only set if not exists to avoid clobbering ongoing counts
  await redis.set(key, "0", { EX: ttlSeconds, NX: true } as any);
}

/** Increment the PR comments counter for a given analysis */
export async function incrementAnalysisCommentCounter(_id: string, delta = 1): Promise<void> {
  const key = getAnalysisCommentsKey(_id);
  await redis.incrby(key, delta);
}

/** Retrieve and clear the PR comments counter for a given analysis */
export async function getAndClearAnalysisCommentCounter(_id: string): Promise<number> {
  const key = getAnalysisCommentsKey(_id);
  const val = await redis.get(key);
  const count = typeof val === "string" ? parseInt(val, 10) : 0;
  try {
    await redis.del(key);
  } catch (_) {}
  return Number.isFinite(count) ? count : 0;
}

type FinalizeStatus = "completed" | "interrupted" | "error";

export interface FinalizeParams {
  _id: string;
  analysis_type: string;
  userId: string;
  repoUrl: string;
  github_repositoryId: string;
  sandboxId: string;
  model: string;
  prompt: string;
  status: FinalizeStatus;
  exitCode?: number | null;
}

export async function finalizeAnalysisAndPersist(params: FinalizeParams): Promise<void> {
  const { _id, analysis_type, userId, repoUrl, model, prompt, status, exitCode, github_repositoryId, sandboxId } = params;
  const key = getAnalysisRedisKey(_id);

  try {
    const rawBuffer = await redis.getBuffer(key);
    const originalBytes = rawBuffer ? rawBuffer.length : 0;
    const compressed = rawBuffer && originalBytes > 0 ? await gzipAsync(rawBuffer) : Buffer.alloc(0);
    // console.log(`[Redis][finalize:start] key=${key} originalBytes=${originalBytes} compressedBytes=${compressed.length} status=${status} exitCode=${exitCode ?? null}`);

    // Pull PR comments posted count from Redis counter
    const prCommentsPosted = await getAndClearAnalysisCommentCounter(_id);

    await Analysis.findOneAndUpdate(
      { _id },
      {
        status,
        exitCode: typeof exitCode === "number" ? exitCode : null,
        logsCompressed: compressed,
        compression: {
          algorithm: "gzip",
          originalBytes,
          compressedBytes: compressed.length,
        },
        // Persist total PR comments posted during the run
        pr_comments_posted: prCommentsPosted,
        // Also persist immutable metadata when creating on finalize
        ...(analysis_type && userId && repoUrl && github_repositoryId && sandboxId && model && prompt
          ? {
              analysis_type,
              userId,
              repoUrl,
              github_repositoryId,
              sandboxId,
              model,
              prompt,
            }
          : {}),
      },
      { new: true, upsert: true }
    );
    console.log(`[Mongo][updated] _id=${_id}`);
  } finally {
    try {
      const delCount = await redis.del(key);
      // console.log(`[Redis][cleanup] key=${key} deleted=${delCount}`);
    } catch (_) {}
  }
}


