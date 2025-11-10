"use client";

import React, { useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import NoInstallationOnboarding from "@/app/(root)/dashboard/_components/NoInstallationOnboarding";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDashboardData } from "../_actions/getDashboardData";
import { getUserInstallations } from "@/_actions/user-actions";

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
        const data = await getUserInstallations();
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

          {/* Bento Layout: Charts on left, Recent Activity on right */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left side - Recent Activity (takes 2 columns) */}
            <div className="w-full">
              <RecentActivity data={dashboardData.data} />
            </div>

            {/* Right side - Charts stacked (takes 1 column) */}
            <div className="w-full flex flex-col gap-4">
              <GitHubIssuesChart data={dashboardData.data} />
              <PullRequestsChart data={dashboardData.data} />
            </div>
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
