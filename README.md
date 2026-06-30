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

## Repository

- GitHub: https://github.com/karanpraja902/ai-code-review-platform
- Author: Karan Prajapat <karanpraja902@gmail.com>
