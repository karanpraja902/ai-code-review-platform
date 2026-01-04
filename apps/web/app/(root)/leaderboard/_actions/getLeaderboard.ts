"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";

export interface LeaderboardItem {
  rank: number;
  username: string;
  name?: string;
  avatar?: string;
  totalPRs: number;
  totalMerged: number;
  totalAdditions: number;
  totalDeletions: number;
  totalLinesCommitted: number;
  totalCommits: number;
  lastPRDate: string;
}

export interface GetLeaderboardOptions {
  page?: number;
  limit?: number;
  query?: string;
  days?: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardItem[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getLeaderboard = async (opts: GetLeaderboardOptions = {}) => {
  try {
    const { token } = await getAuthToken();
    const params = new URLSearchParams();
    if (opts.page && Number.isFinite(opts.page)) params.set("page", String(opts.page));
    if (opts.limit && Number.isFinite(opts.limit)) params.set("limit", String(opts.limit));
    if (opts.query && opts.query.trim().length > 0) params.set("search", opts.query.trim());
    if (opts.days && Number.isFinite(opts.days)) params.set("days", String(opts.days));

    const qs = params.toString();
    const url = `${_config.API_BASE_URL}/api/team/leaderboard${qs ? `?${qs}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard");
    }

    const data: LeaderboardResponse = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching leaderboard", {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};
