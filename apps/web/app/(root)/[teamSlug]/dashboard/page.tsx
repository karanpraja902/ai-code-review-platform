import React, { Suspense } from "react";
import { getTeamDashboardData } from "./_actions/getTeamDashboardData";
import { Loader2 } from "lucide-react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import TeamDashboardPage from "./_components/TeamDashboardPage";

interface PageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { teamSlug } = await params;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["teamDashboard", teamSlug, 7],
    queryFn: () => getTeamDashboardData(7),
  });

  return (
    <div className="h-svh w-full mx-auto">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ErrorBoundary
          fallback={
            <div className="h-full flex items-center justify-center px-4 py-5">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">
                  Error fetching team dashboard data
                </h2>
              </div>
            </div>
          }>
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center px-4 py-5">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading team dashboard...</span>
                </div>
              </div>
            }>
            <TeamDashboardPage />
          </Suspense>
        </ErrorBoundary>
      </HydrationBoundary>
    </div>
  );
};

export default Page;
