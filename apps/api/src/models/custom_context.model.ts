import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewTypeConfig {
  enabled: boolean;
  description: string;
  prompt: string;
}

export interface ICustomContext extends Document {
  name: string;
  createdBy: string;
  team: string;
  customPrompt?: string;
  repositories: string[];
  styleReviews: IReviewTypeConfig;
  securityReviews: IReviewTypeConfig;
  performanceReviews: IReviewTypeConfig;
  codeQualityReviews: IReviewTypeConfig;
  documentationReviews: IReviewTypeConfig;
  // testingReviews: IReviewTypeConfig;
  accessibilityReviews: IReviewTypeConfig;
  bestPracticesReviews: IReviewTypeConfig;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_REVIEW_PROMPTS = {
  styleReviews: {
    description: 'Review CSS/UI styling for critical layout-breaking issues',
    prompt: `Only report styling issues that cause broken layouts, overflow bugs, or render the UI unusable. Skip minor style preferences.`,
  },
  securityReviews: {
    description: 'Identify exploitable security vulnerabilities',
    prompt: `Only report security issues that are exploitable: SQL/NoSQL injection, XSS, authentication bypass, exposed secrets/credentials, or missing authorization checks. Skip theoretical vulnerabilities.`,
  },
  performanceReviews: {
    description: 'Identify performance issues causing outages or degradation',
    prompt: `Only report performance issues that can cause outages or severe degradation: N+1 queries, memory leaks, blocking async operations, or missing resource cleanup. Skip minor optimizations.`,
  },
  codeQualityReviews: {
    description: 'Identify code issues causing bugs or maintainability risks',
    prompt: `Only report code quality issues that can cause bugs or long-term maintainability risks: missing error handling, logic errors, race conditions, or severe code duplication. Skip style preferences and minor refactoring.`,
  },
  documentationReviews: {
    description: 'Check for critically missing documentation',
    prompt: `Only report missing documentation for public APIs, complex business logic, or security-critical functions. Skip minor documentation gaps.`,
  },
  accessibilityReviews: {
    description: 'Check for critical accessibility violations',
    prompt: `Only report accessibility issues that block users: missing form labels, broken keyboard navigation, or missing alt text on functional images. Skip minor ARIA enhancements.`,
  },
  bestPracticesReviews: {
    description: 'Check for critical best practice violations',
    prompt: `Only report best practice violations that cause bugs or security risks: hardcoded secrets, missing error boundaries, or broken backwards compatibility. Skip minor pattern preferences.`,
  },
};

const ReviewTypeConfigSchema = new Schema<IReviewTypeConfig>(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    prompt: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const CustomContextSchema = new Schema<ICustomContext>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    team: {
      type: String,
      ref: 'Team',
      required: true,
      index: true,
    },
    customPrompt: {
      type: String,
      trim: true,
    },
    repositories: {
      type: [String],
      ref: 'Github_Repository',
      default: [],
    },
    styleReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.styleReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.styleReviews.prompt,
      }),
    },
    securityReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.securityReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.securityReviews.prompt,
      }),
    },
    performanceReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.performanceReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.performanceReviews.prompt,
      }),
    },
    codeQualityReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: true,
        description: DEFAULT_REVIEW_PROMPTS.codeQualityReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.codeQualityReviews.prompt,
      }),
    },
    documentationReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.documentationReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.documentationReviews.prompt,
      }),
    },
    // testingReviews: {
    //   type: ReviewTypeConfigSchema,
    //   default: () => ({
    //     enabled: false,
    //     description: DEFAULT_REVIEW_PROMPTS.testingReviews.description,
    //     prompt: DEFAULT_REVIEW_PROMPTS.testingReviews.prompt,
    //   }),
    // },
    accessibilityReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.accessibilityReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.accessibilityReviews.prompt,
      }),
    },
    bestPracticesReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.bestPracticesReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.bestPracticesReviews.prompt,
      }),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

CustomContextSchema.index({ team: 1, isDefault: 1 });
CustomContextSchema.index({ createdBy: 1, team: 1 });

export default mongoose.models.Custom_Context || mongoose.model<ICustomContext>('Custom_Context', CustomContextSchema);
