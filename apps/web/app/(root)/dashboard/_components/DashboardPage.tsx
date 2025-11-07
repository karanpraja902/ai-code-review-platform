"use client";

import React from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDashboardData } from "../_actions/getDashboardData";

const DashboardPage = () => {
  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ["dashboardData"],
    queryFn: getDashboardData,
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
