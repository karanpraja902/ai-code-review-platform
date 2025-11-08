"use client";

import React, { useState } from "react";
import { DashboardMetrics } from "@/app/(root)/dashboard/_components/DashboardMetrics";
import { RecentActivity } from "@/app/(root)/dashboard/_components/RecentActivity";
import { GitHubIssuesChart } from "@/app/(root)/dashboard/_components/GitHubIssuesChart";
import { PullRequestsChart } from "@/app/(root)/dashboard/_components/PullRequestsChart";
import { ActivityOverviewChart } from "@/app/(root)/dashboard/_components/ActivityOverviewChart";
import { useParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getTeamDashboardData } from "../_actions/getTeamDashboardData";

const TeamDashboardPage = () => {
  const { teamSlug } = useParams<{ teamSlug: string }>();
  const [days, setDays] = useState<number>(7);

  const { data: dashboardData } = useSuspenseQuery({
    queryKey: ["teamDashboard", teamSlug, days],
    queryFn: () => getTeamDashboardData(days),
  });

  if (!dashboardData.data) {
    return (
      <div className="h-full flex items-center justify-center px-4 py-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Data</h2>
          <p className="text-gray-600">
            No dashboard data available for team: {teamSlug}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-6 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Dashboard</h1>
        <div className="flex items-center">
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

      <DashboardMetrics data={dashboardData.data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity data={dashboardData.data} />
        <GitHubIssuesChart data={dashboardData.data} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PullRequestsChart data={dashboardData.data} />
        <ActivityOverviewChart data={dashboardData.data} />
      </div>
    </div>
  );
};

export default TeamDashboardPage;
