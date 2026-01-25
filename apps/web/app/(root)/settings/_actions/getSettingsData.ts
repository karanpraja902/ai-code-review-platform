"use server";

import { auth } from "@clerk/nextjs/server";
import { _config } from "@/lib/_config";

export interface SettingsData {
  settings: {
    defaultModelRepo?: string;
    defaultModelPr?: string;
    defaultModelRepoName?: string;
    defaultModelPrName?: string;
    commentSeverity?: number;
    prSummarySettings?: {
      enabled?: boolean;
      sequenceDiagram?: boolean;
      issueTables?: boolean;
      impactAsessment?: boolean;
      vibeCheckRap?: boolean;
    };
  };
  availableRepoModels: Array<{ _id: string; name: string; provider: string; input_context_limit?: number }>;
  availablePrModels: Array<{ _id: string; name: string; provider: string; input_context_limit?: number }>;
}

export async function getSettingsData(): Promise<SettingsData> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    
    const headers: Record<string, string> = {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };

    // Fetch team settings and available models in parallel
    const [settingsRes, repoModelsRes, prModelsRes] = await Promise.all([
      fetch(`${_config.API_BASE_URL}/api/team/settings`, { 
        headers,
        cache: "no-store" // Ensure fresh data
      }),
      fetch(`${_config.API_BASE_URL}/api/ai/models?mode=full_repo_analysis`, { 
        headers,
        next: { revalidate: 3600 } // Cache for 1 hour
      }),
      fetch(`${_config.API_BASE_URL}/api/ai/models?mode=pr_analysis`, { 
        headers,
        next: { revalidate: 3600 } // Cache for 1 hour
      }),
    ]);

    // Process settings
    let settings = {};
    if (settingsRes.ok) {
      const settingsJson = await settingsRes.json();
      settings = settingsJson?.data || {};
    }

    // Process available models
    let availableRepoModels: any[] = [];
    if (repoModelsRes.ok) {
      const repoModelsJson = await repoModelsRes.json();
      availableRepoModels = Array.isArray(repoModelsJson?.data) ? repoModelsJson.data : [];
    }

    let availablePrModels: any[] = [];
    if (prModelsRes.ok) {
      const prModelsJson = await prModelsRes.json();
      availablePrModels = Array.isArray(prModelsJson?.data) ? prModelsJson.data : [];
    }

    return {
      settings,
      availableRepoModels,
      availablePrModels,
    };
  } catch (error) {
    console.error("Error fetching settings data:", error);
    return {
      settings: {},
      availableRepoModels: [],
      availablePrModels: [],
    };
  }
}
