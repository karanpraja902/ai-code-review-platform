"use server";

import { apiPost } from "@/lib/api-client";
import { logger } from "@/lib/logger";

export interface UpgradeRequestPayload {
  startupName: string;
  startupUrl: string;
  description?: string;
}

export const requestUpgrade = async (payload: UpgradeRequestPayload) => {
  try {
    const response = await apiPost("/api/user/request/upgrade", payload, { includeTeamId: false });
    if (!response.ok) {
      throw new Error(`Failed to request upgrade: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Upgrade request failed", { error: error instanceof Error ? error.message : error });
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};