"use server";

import { apiPost } from "@/lib/api-client";
import { logger } from "@/lib/logger";

export const requestEarlyAccess = async () => {
  try {
    const response = await apiPost("/api/user/request/early-access", undefined, { includeTeamId: false });
    if (!response.ok) {
      throw new Error(`Failed to request early access: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error("Early access request failed", { error: error instanceof Error ? error.message : error });
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};