"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconBrandGithub } from "@tabler/icons-react";
import { StarsIcon, ScanTextIcon, AtSign, PlayIcon } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { _config } from "@/lib/_config";
import Link from "next/link";

// Highlighted command badge component
const Command = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 px-1.5 py-0.5 rounded text-xs font-mono">
    {children}
  </code>
);

const HowToCard = ({
  title,
  description,
  icon: Icon,
  imageSrc,
  imageAlt,
  href,
  cta,
  points,
  isSignedIn,
  isExternal = true,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  imageSrc?: string;
  imageAlt?: string;
  href?: string;
  cta?: string;
  points?: React.ReactNode[];
  isSignedIn?: boolean;
  isExternal?: boolean;
}) => {
  // Determine the actual href based on sign-in status
  const actualHref = href && !isSignedIn && !isExternal ? "/sign-in" : href;
  
  return (
    <Card className="bg-transparent relative overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-3">
        {Icon ? <Icon className="text-muted-foreground h-5 w-5" /> : null}
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {points && points.length > 0 && (
          <ul className="text-muted-foreground text-sm space-y-2 list-disc list-inside pr-24">
            {points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        )}
        {actualHref && cta && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-2 cursor-pointer"
          >
            {isExternal && isSignedIn !== false ? (
              <a href={actualHref} target="_blank" rel="noopener noreferrer">
                {cta}
              </a>
            ) : (
              <Link href={actualHref}>
                {cta}
              </Link>
            )}
          </Button>
        )}
      </CardContent>
      {imageSrc && (
        <div className="absolute bottom-2 right-2">
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            width={100}
            height={100}
            className="opacity-80"
          />
        </div>
      )}
    </Card>
  );
};

const HowToInteractCard = () => {
  const [hasInstallations, setHasInstallations] = useState<boolean | null>(null);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const checkInstallations = async () => {
      try {
        if (!_config.API_BASE_URL || !isSignedIn) {
          if (!cancelled) setHasInstallations(false);
          return;
        }
        const token = await getToken();
        const res = await fetch(`${_config.API_BASE_URL}/api/team/installations`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        const data = await res.json();
        const arr = Array.isArray(data?.data) ? data.data : [];
        if (!cancelled) setHasInstallations(arr.length > 0);
      } catch (_) {
        if (!cancelled) setHasInstallations(false);
      }
    };
    checkInstallations();
    return () => { cancelled = true; };
  }, [getToken, isSignedIn]);

  // Determine GitHub app URL or sign-in redirect
  const githubAppUrl = isSignedIn 
    ? `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "ai-code-review"}/installations/select_target`
    : "/sign-in";

  return (
    <Card className="rounded-md p-5 bg-transparent">
      <div className="mb-2">
        <h2 className="text-xl font-bold">How to Interact with AI Code Review</h2>
        <span className="text-muted-foreground text-sm">
          Learn how to use ai-code-review and how ai-code-review works
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
        {!hasInstallations && (
          <>
            <HowToCard
              title="Install the GitHub App"
              description="Authorize AI Code Review for your personal or organization account to access repositories."
              icon={IconBrandGithub}
              href={githubAppUrl}
              cta="Install on GitHub"
              isSignedIn={isSignedIn}
              isExternal={isSignedIn === true}
            />
            <HowToCard
              title="Add and Sync Repositories"
              description="Add repos from GitHub and sync to fetch branches, issues, and PRs."
              icon={ScanTextIcon}
              href={githubAppUrl}
              cta="Add from GitHub"
              isSignedIn={isSignedIn}
              isExternal={isSignedIn === true}
            />
          </>
        )}
        <HowToCard
          title="Run Analyses"
          // description="Trigger full repo reviews or PR checks to surface issues and suggestions."
          icon={AtSign}
          imageSrc="/@ai-code-review.png"
          points={[
            <>Once repos are connected, PR analysis will automatically enabled</>,
            <>Comment <Command>@ai-code-review</Command> on any PR to start analysis manually</>,
            <>Comment <Command>@ai-code-review stop</Command> to stop any ongoing analysis</>,
          ]}
          isSignedIn={isSignedIn}
        />
        <HowToCard
          title="Review Insights"
          // description="Track metrics and recent activity on your dashboard as analyses complete."
          icon={StarsIcon}
          imageSrc="/metrics.png"
          points={[
            <>View detailed analysis statistics on your dashboard</>,
            <>Track PR reviews and code quality metrics over time</>,
            // <>Monitor recent activity as analyses complete</>,
          ]}
          href="/dashboard"
          cta="Go to Dashboard"
          isSignedIn={isSignedIn}
          isExternal={false}
        />
      </div>

      {/* Full-width feature cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        {/* Custom Context Card */}
        <Card className="bg-transparent overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3">
            <ScanTextIcon className="text-muted-foreground h-5 w-5" />
            <CardTitle className="text-base">Custom Context</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-muted-foreground text-sm space-y-2 list-disc list-inside mb-4">
              <li>Define project-specific rules and guidelines for AI Code Review to follow</li>
              <li>Provide documentation, coding standards, or architectural patterns</li>
              <li>Ensure reviews align perfectly with your team&apos;s preferences</li>
            </ul>
            <Button variant="outline" asChild size="sm">
              <Link href="/custom-context">
                Go to Custom Context
              </Link>
            </Button>
            <div className="rounded-lg overflow-hidden mt-4">
              <Image
                src="/review_types.png"
                alt="Custom Context and Review Types"
                width={800}
                height={400}
                className="w-auto h-auto rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="bg-transparent overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3">
            <AtSign className="text-muted-foreground h-5 w-5" />
            <CardTitle className="text-base">Customise your Experience</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-muted-foreground text-sm space-y-2 list-disc list-inside mb-4">
              <li>Adjust comment severity thresholds (Low, Medium, High)</li>
              <li>Customize PR summary sections: diagrams, impact tables, and more</li>
              <li>Toggle advanced features like Vibe Check Rap summaries</li>
            </ul>
            <Button variant="outline" asChild size="sm">
              <Link href="/settings">
                Go to Settings
              </Link>
            </Button>
            <div className="rounded-lg overflow-hidden mt-4">
              <Image
                src="/ai-code-review_settings.png"
                alt="AI Code Review Settings"
                width={800}
                height={400}
                className="w-auto h-auto rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-width feature cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* PR Review Bot Card */}
        <Card className="bg-transparent overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-3">
            <AtSign className="text-muted-foreground h-5 w-5" />
            <CardTitle className="text-base">Ask Questions on PRs</CardTitle>
          
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-muted-foreground text-sm space-y-2 list-disc list-inside mb-4">
              <li>Tag <Command>@ai-code-review</Command> in any PR comment to ask questions</li>
              <li>Get instant answers about code changes, logic, or suggestions</li>
              <li>Works on any PR in your connected repositories</li>
            </ul>
            <div className="rounded-lg overflow-hidden">
              <Image
                src="/pr_review_1.png"
                alt="PR Review Bot - Ask questions on PRs"
                width={600}
                height={400}
                className="w-auto m-auto h-auto rounded-lg border"
              />
            </div>
            
          </CardContent>
        </Card>

        {/* IDE Extension Card */}
        <Card className="bg-transparent overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3">
                        <PlayIcon className="text-muted-foreground h-5 w-5" />

            <CardTitle className="text-base">AI Code Review IDE Extension</CardTitle>
         
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-muted-foreground text-sm space-y-2 list-disc list-inside mb-4">
              <li>Review code changes before committing right inside your IDE</li>
              <li>Get suggestions and improvements in real-time</li>
              <li>Available for VS Code, Cursor, Antigravity and more</li>
            </ul>
            
            <Button variant="outline" asChild size="sm">
              <a 
                href="https://open-vsx.org/extension/AI Code Review/ai-code-review" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Install IDE Extension
              </a>
            </Button>
            <div className="rounded-lg overflow-hidden mt-4">
              <Image
                src="/ai-code-review_extension.jpeg"
                alt="AI Code Review IDE Extension"
                width={800}
                height={400}
                className="w-auto h-auto rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Card>
  );
};

export default HowToInteractCard;
