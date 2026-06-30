# AI Code Review Platform

AI Code Review Platform is a monorepo for an AI-powered code review platform. It connects to GitHub and Bitbucket repositories, runs repository and pull request analysis in isolated sandboxes, streams analysis output, and posts actionable review feedback back to developers.

## Apps and Packages

- `apps/web`: Next.js web application for onboarding, integrations, dashboards, repository analysis, settings, and public pages.
- `apps/api`: Express API for authentication-aware repository sync, analysis execution, webhooks, queues, mail, and integration services.
- `apps/docs`: lightweight Next.js documentation surface.
- `packages/eslint-config`: shared ESLint configuration.
- `packages/typescript-config`: shared TypeScript configuration.
- `packages/ui`: shared React UI package.

## Development

Install dependencies:

```sh
pnpm install
```

Run all development services:

```sh
pnpm dev
```

Build all apps and packages:

```sh
pnpm build
```

Run type checks:

```sh
pnpm check-types
```

## Vercel Deployment

The Vercel project deploys the `web` workspace from the monorepo root. The
root `vercel.json` pins the install/build commands to pnpm 8 so Vercel uses the
checked-in lockfile format.

Required frontend environment variables:

```sh
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_GITHUB_APP_NAME=ai-code-review
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
EXTENSION_JWT_SECRET=
```

The Express API in `apps/api` is a separate service and needs its own host. Set
`NEXT_PUBLIC_API_BASE_URL` to that deployed API URL.

## Repository

- GitHub: https://github.com/karanpraja902/ai-code-review-platform
- Author: Karan Prajapat <karanpraja902@gmail.com>
