"use server";

import { apiGet } from "@/lib/api-client";
import { GithubRepository } from "@/types/types";
import { logger } from "@/lib/logger";

export const getRepository = async (
  query: string,
  orgSlug?: string
) => {
  try {
    // Fetch repositories using team route - teamId is automatically included via headers
    const repoRes = await apiGet(
      `/api/team/repositories?orgSlug=${orgSlug}&search=${query}`,
      {
        cache: "force-cache",
        next: { tags: ["repository_list"] },
      }
    );

    const data: { success: boolean; data: GithubRepository[] } = await repoRes.json();
    return data;
  } catch (error) {
    logger.error("Failed to fetch repositories", { 
      query, 
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error) {
      logger.error("Repository fetch error details", { 
        message: error.message,
        stack: error.stack 
      });

      throw new Error(`${error.message}`);
    } else {
      throw new Error(
        "An unexpected error occurred while fetching the repositories"
      );
    }
  }
};
