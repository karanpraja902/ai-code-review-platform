// apps/api/src/lib/githubApp.ts
import { App } from '@octokit/app';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import dotenv from "dotenv";

dotenv.config();

const githubConfig = () => {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyBase64 = process.env.GITHUB_PRIVATE_KEY_BASE64;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!appId || !privateKeyBase64 || !webhookSecret) {
    throw new Error(
      'GitHub App integration is not configured. Set GITHUB_APP_ID, GITHUB_PRIVATE_KEY_BASE64, and GITHUB_WEBHOOK_SECRET.',
    );
  }
  return {
    appId,
    privateKey: Buffer.from(privateKeyBase64, 'base64').toString('utf8'),
    webhookSecret,
  };
};

// GitHub is optional for local extension/sandbox development. Routes that
// actually use GitHub still fail with an explicit configuration error.
const initialGitHubConfig = process.env.GITHUB_APP_ID
  && process.env.GITHUB_PRIVATE_KEY_BASE64
  && process.env.GITHUB_WEBHOOK_SECRET
  ? githubConfig()
  : null;

export const octokitApp = initialGitHubConfig
  ? new App({
      appId: initialGitHubConfig.appId,
      privateKey: initialGitHubConfig.privateKey,
      webhooks: { secret: initialGitHubConfig.webhookSecret },
    })
  : null;

// Create authenticated Octokit instance for an installation
export const getInstallationOctokit = (installationId: number): Octokit => {
  const config = githubConfig();
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      installationId
    }
  });
};

// Generate installation access token for private repo access
export const generateInstallationToken = async (installationId: number): Promise<string> => {
  try {
    const config = githubConfig();
    const auth = createAppAuth({
      appId: config.appId,
      privateKey: config.privateKey,
      installationId: installationId
    });
    
    const { token } = await auth({ type: 'installation' });
    return token;
  } catch (error) {
    console.error('Error generating installation token:', error);
    throw new Error(`Failed to generate GitHub installation token: ${error}`);
  }
};

