import { Request } from "express";
import Analysis from "../../models/analysis.model.js";
import { logger } from "../../utils/logger.js";

export type FeatureType = 
  | 'maxPrAnalysisPerDay'
  | 'maxFullRepoAnalysisPerDay'
  | 'prioritySupport'
  | 'organizationSupport';

export interface FeatureCheckResult {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  remaining: number;
  message: string;
  featureType: FeatureType;
  planName?: string;
}

export class FeatureAccessChecker {
  
  /**
   * Check if user can access a specific feature based on their subscription
   */
  static async checkFeatureAccess(
    req: Request, 
    featureType: FeatureType, 
    additionalData?: any
  ): Promise<FeatureCheckResult> {
    const subscription = req.sub;
    const userId = req.user?._id;


    console.log("subscription", subscription)
    if (!subscription) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        remaining: 0,
        message: "No subscription found. Please upgrade to access this feature.",
        featureType
      };
    }

    if (!userId) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        remaining: 0,
        message: "User authentication required.",
        featureType
      };
    }

    console.log(featureType, "entering switch case")
    try {
      switch (featureType) {
        case 'maxPrAnalysisPerDay':
          return await this.checkPrAnalysisDailyLimit(userId, subscription.features.maxPrAnalysisPerDay, subscription.planName);

        case 'maxFullRepoAnalysisPerDay':
          return await this.checkFullRepoAnalysisDailyLimit(userId, subscription.features.maxFullRepoAnalysisPerDay, subscription.planName);
        
        case 'prioritySupport':
          return this.checkPrioritySupport(subscription.features.prioritySupport, subscription.planName);
        
        case 'organizationSupport':
          return this.checkOrganizationSupport(subscription.features.organizationSupport, subscription.planName);
        
        default:
          return {
            allowed: false,
            currentCount: 0,
            maxAllowed: 0,
            remaining: 0,
            message: "Unknown feature type.",
            featureType,
            planName: subscription.planName
          };
      }
    } catch (error) {
      logger.error(`Error checking feature access for ${featureType}:`, error);
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        remaining: 0,
        message: "Error checking feature access. Please try again.",
        featureType,
        planName: subscription.planName
      };
    }
  }

  /**
   * Check daily PR analysis limit
   */
  private static async checkPrAnalysisDailyLimit(
    userId: string,
    maxPerDay: number,
    planName: string
  ): Promise<FeatureCheckResult> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Only count analyses that were actually run (exclude skipped analyses)
    const currentCount = await Analysis.countDocuments({
      userId,
      analysis_type: 'pr_analysis',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'skipped' }, // Exclude skipped analyses from the count
    });

    const remaining = Math.max(0, maxPerDay - currentCount);
    const allowed = currentCount < maxPerDay;

    return {
      allowed,
      currentCount,
      maxAllowed: maxPerDay,
      remaining,
      message: allowed
        ? `You can run ${remaining} more PR analyses today on your ${planName} plan`
        : `You've reached your daily PR analysis limit (${maxPerDay}) on your ${planName} plan. Please upgrade or try again tomorrow.`,
      featureType: 'maxPrAnalysisPerDay',
      planName,
    };
  }

  /**
   * Check daily full repo analysis limit
   */
  private static async checkFullRepoAnalysisDailyLimit(
    userId: string,
    maxPerDay: number,
    planName: string
  ): Promise<FeatureCheckResult> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const currentCount = await Analysis.countDocuments({
      userId,
      analysis_type: 'full_repo_analysis',
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const remaining = Math.max(0, maxPerDay - currentCount);
    const allowed = currentCount < maxPerDay;

    return {
      allowed,
      currentCount,
      maxAllowed: maxPerDay,
      remaining,
      message: allowed
        ? `You can run ${remaining} more full repo analyses today on your ${planName} plan`
        : `You've reached your daily full repo analysis limit (${maxPerDay}) on your ${planName} plan. Please upgrade or try again tomorrow.`,
      featureType: 'maxFullRepoAnalysisPerDay',
      planName,
    };
  }

  /**
   * Check priority support access
   */
  private static checkPrioritySupport(
    hasPrioritySupport: boolean, 
    planName: string
  ): FeatureCheckResult {
    return {
      allowed: hasPrioritySupport,
      currentCount: hasPrioritySupport ? 1 : 0,
      maxAllowed: 1,
      remaining: hasPrioritySupport ? 0 : 1,
      message: hasPrioritySupport 
        ? `Priority support is available on your ${planName} plan`
        : `Priority support is not available on your ${planName} plan. Please upgrade to access priority support.`,
      featureType: 'prioritySupport',
      planName
    };
  }

  /**
   * Check organization support access
   */
  private static checkOrganizationSupport(
    hasOrganizationSupport: boolean,
    planName: string
  ): FeatureCheckResult {
    return {
      allowed: hasOrganizationSupport,
      currentCount: hasOrganizationSupport ? 1 : 0,
      maxAllowed: 1,
      remaining: hasOrganizationSupport ? 0 : 1,
      message: hasOrganizationSupport
        ? `Organization support is available on your ${planName} plan`
        : `Organization support is not available on your ${planName} plan. Please upgrade to access organization support.`,
      featureType: 'organizationSupport',
      planName
    };
  }

  /**
   * Check multiple features at once
   */
  static async checkMultipleFeatures(
    req: Request, 
    features: FeatureType[], 
    additionalData?: any
  ): Promise<Record<FeatureType, FeatureCheckResult>> {
    const results: Record<string, FeatureCheckResult> = {};

    for (const feature of features) {
      results[feature] = await this.checkFeatureAccess(req, feature, additionalData);
    }

    return results as Record<FeatureType, FeatureCheckResult>;
  }
}