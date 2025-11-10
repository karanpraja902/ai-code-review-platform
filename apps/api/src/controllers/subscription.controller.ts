import { Request, Response } from "express";
import { logger } from "../utils/logger.js";

/**
 * Test endpoint to demonstrate accessing subscription features
 * This shows how to use req.sub to access user's subscription data
 */
export const getSubscriptionFeatures = async (req: Request, res: Response) => {
  try {
    // Access subscription data from req.sub (set by checkAuth middleware)
    const subscription = req.sub;

  if (!subscription) {
      return res.status(200).json({
        message: "No subscription data available",
        hasSubscription: false,
        defaultFeatures: {
          maxTeams: 0,
          maxTeamMembers: 1,
          maxPrAnalysisPerDay: 5,
          maxFullRepoAnalysisPerDay: 2,
          prioritySupport: false,
          organizationSupport: false,
        }
      });
    }

    const canCreateTeam = (currentTeamCount: number) => {
      return currentTeamCount < subscription.features.maxTeams;
    };

    const canRunPrAnalysisToday = (currentTodayPrCount: number) => {
      return currentTodayPrCount < subscription.features.maxPrAnalysisPerDay;
    };

    const canRunFullRepoAnalysisToday = (currentTodayFullRepoCount: number) => {
      return currentTodayFullRepoCount < subscription.features.maxFullRepoAnalysisPerDay;
    };

    logger.info(`Subscription features accessed for plan: ${subscription.planName}`);

    return res.status(200).json({
      message: "Subscription features retrieved successfully",
      hasSubscription: true,
      subscription: {
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        features: subscription.features,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      // Example usage functions
      examples: {
        canCreateTeam: canCreateTeam(0), // Example with 0 current teams
        canRunPrAnalysisToday: canRunPrAnalysisToday(0),
        canRunFullRepoAnalysisToday: canRunFullRepoAnalysisToday(0),
      }
    });
  } catch (error) {
    logger.error(`Error retrieving subscription features: ${error}`);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Example of checking subscription limits in business logic
 */
export const checkProjectCreationLimit = async (req: Request, res: Response) => {
  try {
    const subscription = req.sub;
    const { analysisType, currentTodayCount = 0 } = req.body as { analysisType: 'pr_analysis' | 'full_repo_analysis'; currentTodayCount?: number };

    if (!subscription) {
      return res.status(403).json({
        message: "No subscription found. Please upgrade to run analyses.",
        canCreate: false
      });
    }
    const isPr = analysisType === 'pr_analysis';
    const maxAllowed = isPr ? subscription.features.maxPrAnalysisPerDay : subscription.features.maxFullRepoAnalysisPerDay;
    const canCreate = currentTodayCount < maxAllowed;
    const remaining = Math.max(0, maxAllowed - currentTodayCount);

    return res.status(200).json({
      canCreate,
      currentCount: currentTodayCount,
      maxAllowed,
      remaining,
      planName: subscription.planName,
      message: canCreate 
        ? `You can run ${remaining} more ${isPr ? 'PR' : 'full repo'} analyses today on your ${subscription.planName} plan`
        : `You've reached your daily ${isPr ? 'PR' : 'full repo'} analysis limit (${maxAllowed}) on your ${subscription.planName} plan. Please upgrade or try again tomorrow.`
    });
  } catch (error) {
    logger.error(`Error checking project creation limit: ${error}`);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};