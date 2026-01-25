"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import NoInstallationOnboarding from "@/app/(root)/dashboard/_components/NoInstallationOnboarding";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDashboardData } from "../_actions/getDashboardData";
import { getTeamInstallations } from "@/_actions/user-actions";
import { 
  DashboardMetricsSkeleton, 
  ChartSkeleton, 
  RecentActivitySkeleton 
} from "./LoadingSkeletons";

// Dynamic imports for heavy chart components to reduce initial bundle size
const DashboardMetrics = dynamic(
  () => import("@/app/(root)/dashboard/_components/DashboardMetrics").then(mod => ({ default: mod.DashboardMetrics })),
  { loading: () => <DashboardMetricsSkeleton />, ssr: false }
);

const RecentActivity = dynamic(
  () => import("@/app/(root)/dashboard/_components/RecentActivity").then(mod => ({ default: mod.RecentActivity })),
  { loading: () => <RecentActivitySkeleton />, ssr: false }
);

const ReviewedLinesChart = dynamic(
  () => import("./ReviewedLinesChart").then(mod => ({ default: mod.ReviewedLinesChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

// Keep these for future use when uncommented
// const GitHubIssuesChart = dynamic(() => import("./GitHubIssuesChart").then(mod => ({ default: mod.GitHubIssuesChart })), { loading: () => <ChartSkeleton /> });
// const PullRequestsChart = dynamic(() => import("./PullRequestsChart").then(mod => ({ default: mod.PullRequestsChart })), { loading: () => <ChartSkeleton /> });
// const ActivityOverviewChart = dynamic(() => import("./ActivityOverviewChart").then(mod => ({ default: mod.ActivityOverviewChart })), { loading: () => <ChartSkeleton /> });
// const FullRepoReviewChart = dynamic(() => import("./FullRepoReviewChart").then(mod => ({ default: mod.FullRepoReviewChart })), { loading: () => <ChartSkeleton /> });

const DashboardPage = () => {
  const [days, setDays] = useState<number>(7);

  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ["dashboardData", days],
    queryFn: () => getDashboardData(days),
  });

  const { data: installations } = useSuspenseQuery({
    queryKey: ["userInstallations"],
    queryFn: async () => {
      try {
        const data = await getTeamInstallations();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },
  });

  // Defer conditional rendering to the main content area so the header remains.

  return (
    <div className="h-full p-5 space-y-6">
      {/* Top-right range selector */}
      <div className="flex items-center justify-between">

      <h1 className="text-3xl font-bold">Hello 👋 </h1>

      <div className="flex items-center ">
        <select
          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={15}>Last 15 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      </div>

      {(!installations || installations.length === 0) ? (
        <NoInstallationOnboarding />
      ) : !dashboardData.data ? (
        <div className="h-full flex items-center justify-center px-4 py-5">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      ) : (
        <>
          {/* Dashboard Metrics */}
          <DashboardMetrics data={dashboardData.data} />

          {/* 2x2 Grid Layout: 4 Charts in 2 columns, 2 rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Row 1, Column 1 - Recent Activity */}
            <RecentActivity data={dashboardData.data} />
            
            <ReviewedLinesChart data={dashboardData.data} />

            {/* Row 1, Column 2 - Full Repo Review */}
            {/* <FullRepoReviewChart data={dashboardData.data} /> */}
            
            {/* Row 2, Column 1 - Pull Requests Chart */}
            {/* <PullRequestsChart data={dashboardData.data} /> */}
            
            {/* Row 2, Column 2 - GitHub Issues Chart */}
            {/* <GitHubIssuesChart data={dashboardData.data} /> */}
          </div>

          {/* Activity Overview Chart - Full width below */}
          {/* <div className="mb-6">
              <ActivityOverviewChart data={dashboardData} />
            </div> */}
        </>
      )}
    </div>
  );
};

export default DashboardPage;
