"use client";

import { UserButton, OrganizationSwitcher, useAuth } from "@clerk/nextjs";
import { ScanTextIcon, StarsIcon, BotIcon, GitPullRequest } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import AI Code ReviewLogo from "@/components/shared/ai-code-review-logo";
import ThemeToggle from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { UpgradePlanDialog } from "@/components/shared/UpgradePlanDialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import { _config } from "@/lib/_config";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: StarsIcon,
  },
  {
    title: "Repositories",
    url: "/analysis",
    icon: ScanTextIcon,
  },
  {
    title: "Pull Requests",
    url: "/pr-analysis",
    icon: GitPullRequest,
  },
  // {
  //   title: "Agents",
  //   url: "/agents",
  //   icon: BotIcon,
  // },
];

const AppSidebar = () => {
  const { open } = useSidebar();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { getToken } = useAuth();

  const [loadingPlan, setLoadingPlan] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(true);
  // Upgrade modal open state
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPlan = async () => {
      try {
        // If API base URL is not configured, default to free plan
        if (!_config.API_BASE_URL) {
          if (!cancelled) {
            setIsFreePlan(true);
            setLoadingPlan(false);
          }
          return;
        }
        const token = await getToken();
        const res = await fetch(`${_config.API_BASE_URL}/api/subscription/features`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        const data = await res.json();
        const hasSubscription = Boolean(data?.hasSubscription);
        const planName: string | undefined = data?.subscription?.planName;
        const free = !hasSubscription || (planName?.toLowerCase() === "free");
        if (!cancelled) {
          setIsFreePlan(Boolean(free));
          setLoadingPlan(false);
        }
      } catch (e) {
        if (!cancelled) {
          // On error, be conservative and show upgrade option
          setIsFreePlan(true);
          setLoadingPlan(false);
        }
      }
    };
    fetchPlan();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  // Helper function to get current path without team slug
  const getCurrentPathWithoutTeamSlug = (): string => {
    const pathSegments = pathname.split("/").filter(Boolean) as any;
    // If first segment looks like a team slug (not dashboard, analysis, agents, etc.)
    if (
      pathSegments.length > 0 &&
      !["dashboard", "analysis", "agents", "repo"].includes(pathSegments[0])
    ) {
      const pathWithoutSlug = "/" + pathSegments.slice(1).join("/");
      return pathWithoutSlug || "/dashboard";
    }
    return pathname || "/dashboard";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu
          className={cn(
            "p-0 flex-row items-center",
            open ? "justify-between" : "justify-center"
          )}>
          <SidebarMenuItem
            className={cn("p-0", open ? "not-sr-only" : "sr-only")}>
            <SidebarMenuButton asChild>
              <Link href={"/dashboard"} className="flex items-center gap-1">
                <AI Code ReviewLogo />

                <span
                  className={cn(
                    "font-semibold",
                    open ? "not-sr-only" : "sr-only"
                  )}>
                  AI CODE REVIEW
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarTrigger className="cursor-pointer" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link
                      href={item.url}
                      className={cn(
                        pathname === item.url
                          ? "bg-primary/40 border-l-2 border-primary"
                          : ""
                      )}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu
          className={cn("items-center justify-between flex-col gap-4")}>
          <div
            className={cn(
              "flex items-center justify-between w-full gap-4",
              open ? "flex-row-reverse" : "flex-col-reverse"
            )}>
            <SidebarMenuItem className="items-center justify-center flex">
              <SidebarMenuButton asChild>
                <UserButton
                  appearance={{
                    baseTheme: resolvedTheme === "dark" ? dark : undefined,
                    elements: {
                      userButtonAvatarBox: "w-5 h-5",
                      userButtonTrigger: "p-0",
                    },
                  }}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <ThemeToggle darkIconClassName="text-foreground fill-foreground" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>

          <SidebarMenuItem className="items-center justify-start flex w-full">
            {loadingPlan ? (
              <div className={cn("w-full text-xs text-muted-foreground", open ? "px-1 py-2" : "px-0")}>Checking plan…</div>
            ) : isFreePlan ? (
              <>
                <Button className="w-full" onClick={() => setUpgradeOpen(true)}>
                  Upgrade for free
                </Button>
                <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
              </>
            ) : (
              <SidebarMenuButton asChild>
                <OrganizationSwitcher
                  hidePersonal={false}
                  afterSelectOrganizationUrl={(organization) => {
                    const currentPathWithoutSlug = getCurrentPathWithoutTeamSlug();
                    return `/${organization.slug}${currentPathWithoutSlug}`;
                  }}
                  afterSelectPersonalUrl={() => {
                    return getCurrentPathWithoutTeamSlug();
                  }}
                  afterCreateOrganizationUrl={(organization) => {
                    return `/${organization.slug}/dashboard`;
                  }}
                  appearance={{
                    baseTheme: resolvedTheme === "dark" ? dark : undefined,
                    elements: {
                      organizationSwitcherTrigger: cn(
                        "cursor-pointer",
                        open ? "p-1" : "ml-1 w-7 h-7 overflow-hidden"
                      ),
                    },
                  }}
                />
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
