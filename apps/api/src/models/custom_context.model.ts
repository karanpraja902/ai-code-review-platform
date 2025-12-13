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
  testingReviews: IReviewTypeConfig;
  accessibilityReviews: IReviewTypeConfig;
  bestPracticesReviews: IReviewTypeConfig;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_REVIEW_PROMPTS = {
  styleReviews: {
    description: 'Check for code formatting, naming conventions, and style consistency',
    prompt: `Review the code for style and formatting issues:
- Check for consistent naming conventions (camelCase, PascalCase, snake_case as appropriate)
- Verify proper indentation and code formatting
- Look for consistent use of quotes (single vs double)
- Check line length and code readability
- Identify any style guide violations
- Review import organization and ordering
- Check for consistent spacing and bracing styles`,
  },
  securityReviews: {
    description: 'Identify security vulnerabilities and potential exploits',
    prompt: `Perform a security review of the code:
- Check for SQL injection vulnerabilities
- Look for XSS (Cross-Site Scripting) vulnerabilities
- Identify potential CSRF issues
- Review authentication and authorization logic
- Check for sensitive data exposure (API keys, passwords, tokens)
- Look for insecure direct object references
- Review input validation and sanitization
- Check for secure communication (HTTPS, encryption)
- Identify potential denial of service vulnerabilities
- Review error handling for information leakage`,
  },
  performanceReviews: {
    description: 'Identify performance bottlenecks and optimization opportunities',
    prompt: `Review the code for performance issues:
- Identify N+1 query problems
- Look for unnecessary loops or nested iterations
- Check for memory leaks or excessive memory usage
- Review database query efficiency
- Identify opportunities for caching
- Check for blocking operations in async contexts
- Look for redundant computations
- Review resource cleanup and disposal
- Check for efficient data structure usage
- Identify potential concurrency issues`,
  },
  codeQualityReviews: {
    description: 'Evaluate code maintainability, readability, and design patterns',
    prompt: `Evaluate the overall code quality:
- Check for code duplication (DRY principle)
- Review function and class complexity
- Verify single responsibility principle adherence
- Look for proper error handling
- Check for magic numbers and hardcoded values
- Review variable and function naming clarity
- Identify dead or unreachable code
- Check for proper abstraction levels
- Review dependency management
- Look for code smells and anti-patterns`,
  },
  documentationReviews: {
    description: 'Check for adequate comments, JSDoc, and documentation',
    prompt: `Review the code documentation:
- Check for missing function/method documentation
- Verify JSDoc/docstring completeness and accuracy
- Look for outdated or misleading comments
- Review README and inline documentation
- Check for self-documenting code practices
- Verify API documentation completeness
- Look for TODO comments that need addressing
- Check for proper type annotations
- Review changelog and version documentation`,
  },
  testingReviews: {
    description: 'Evaluate test coverage and testing practices',
    prompt: `Review the testing practices:
- Check for adequate test coverage
- Verify unit tests for critical functions
- Look for edge case testing
- Review integration test completeness
- Check for test isolation and independence
- Verify mock and stub usage appropriateness
- Look for flaky or unreliable tests
- Review test naming and organization
- Check for assertion quality and specificity
- Identify missing test scenarios`,
  },
  accessibilityReviews: {
    description: 'Check for accessibility compliance (WCAG, ARIA, etc.)',
    prompt: `Review the code for accessibility compliance:
- Check for proper ARIA labels and roles
- Verify keyboard navigation support
- Look for appropriate alt text on images
- Review color contrast ratios
- Check for semantic HTML usage
- Verify form label associations
- Look for focus management issues
- Review screen reader compatibility
- Check for responsive design accessibility
- Verify skip links and landmark regions`,
  },
  bestPracticesReviews: {
    description: 'Ensure adherence to industry best practices and standards',
    prompt: `Review adherence to best practices:
- Check for SOLID principles compliance
- Verify proper version control practices
- Look for environment-specific configurations
- Review logging and monitoring practices
- Check for proper dependency injection
- Verify configuration management
- Look for proper secrets management
- Review API design patterns (REST, GraphQL)
- Check for proper error boundaries
- Verify backwards compatibility considerations`,
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
        enabled: true,
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
    testingReviews: {
      type: ReviewTypeConfigSchema,
      default: () => ({
        enabled: false,
        description: DEFAULT_REVIEW_PROMPTS.testingReviews.description,
        prompt: DEFAULT_REVIEW_PROMPTS.testingReviews.prompt,
      }),
    },
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
        enabled: true,
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
