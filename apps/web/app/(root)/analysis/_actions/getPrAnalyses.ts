"use server";

import { getAuthToken } from "@/_actions/auth-token";
import { _config } from "@/lib/_config";
import { logger } from "@/lib/logger";

export interface PrAnalysisItem {
  repoUrl: string;
  model: string;
  status: string;
  pr_number?: number;
  pr_url?: string;
  pr_title?: string;
  createdAt?: string;
}

export const getPrAnalyses = async () => {
  try {
    const { token } = await getAuthToken();

    const url = `${_config.API_BASE_URL}/api/analysis/pull_requests`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch PR analyses");
    }

    const data: { success: boolean; data: PrAnalysisItem[]; message?: string } = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching PR analyses", {
      error: error instanceof Error ? error.message : error,
    });

  }
};