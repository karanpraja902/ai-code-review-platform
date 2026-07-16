import { Sandbox, SandboxOpts } from '@e2b/code-interpreter';

// Get AWS credentials from environment variables
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_BEDROCK_API_KEY = process.env.AWS_BEDROCK_API_KEY;
const GOOGLE_CREDENTIALS_JSON_BASE64 = process.env.GOOGLE_CREDENTIALS_JSON_BASE64;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION;
const AI_CODE_REVIEW_DB = process.env.AI_CODE_REVIEW_DB;
const REDIS_URL = process.env.REDIS_URL;

// Validate AWS credentials are present
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.warn('⚠️ AWS credentials not found in environment variables. AWS services may not work in the sandbox.');
  console.warn('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment.');
} else {
  console.log('✅ AWS credentials found in environment variables');
}

// Build environment variables object for sandbox
const envs: Record<string, string> = {
  // AWS credentials for Bedrock provider (boto3 will read these)
  AWS_ACCESS_KEY_ID: AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY || '',
  AWS_DEFAULT_REGION: AWS_REGION,
  AWS_REGION: AWS_REGION,
};

// Add AWS Bedrock API key if provided
if (AWS_BEDROCK_API_KEY) {
  envs.AWS_BEDROCK_API_KEY = AWS_BEDROCK_API_KEY;
}

// Add Google credentials if provided
if (GOOGLE_CREDENTIALS_JSON_BASE64) {
  envs.GOOGLE_CREDENTIALS_JSON_BASE64 = GOOGLE_CREDENTIALS_JSON_BASE64;
}
if (GOOGLE_API_KEY) {
  envs.GOOGLE_API_KEY = GOOGLE_API_KEY;
}
if (GOOGLE_CLOUD_PROJECT) {
  envs.GOOGLE_CLOUD_PROJECT = GOOGLE_CLOUD_PROJECT;
}
if (GOOGLE_CLOUD_LOCATION) {
  envs.GOOGLE_CLOUD_LOCATION = GOOGLE_CLOUD_LOCATION;
}
if (AI_CODE_REVIEW_DB) {
  envs.AI_CODE_REVIEW_DB = AI_CODE_REVIEW_DB;
}
if (REDIS_URL) {
  envs.REDIS_URL = REDIS_URL;
}

const DEFAULT_OPTIONS: SandboxOpts = {
  apiKey: process.env.E2B_API_KEY!,
  timeoutMs: 60 * 60 * 1000,          // 60 minutes default
  envs: envs,
};


export function createSandbox(
  overrides: Partial<any> = {}
): Promise<Sandbox> {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };
  // Merge envs if overrides contain them
  if (overrides.envs) {
    opts.envs = { ...DEFAULT_OPTIONS.envs, ...overrides.envs };
  }
  return Sandbox.create(process.env.E2B_SANDBOX_TEMPLATE!, opts);
}

export function connectSandbox(
  sandboxId: string,
): Promise<Sandbox> {
  return Sandbox.connect(sandboxId, DEFAULT_OPTIONS);
}
