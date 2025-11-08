"use client";

import React, { useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDashboardData } from "../_actions/getDashboardData";

const DashboardPage = () => {
  const [days, setDays] = useState<number>(7);

  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ["dashboardData", days],
    queryFn: () => getDashboardData(days),
  });

  if (!dashboardData.data) {
    return (
      <div className="h-full flex items-center justify-center px-4 py-5">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollBar px-4 py-5">
      {/* Top-right range selector */}
      <div className="flex items-center justify-end mb-4">
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
    </div>
  );
};

export default DashboardPage;
