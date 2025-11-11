import React, { Suspense } from "react";

import { getRepoSettings } from "./_actions/getRepoSettings";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import SettingsForm from "./_components/SettingsForm";
import { Loader2Icon } from "lucide-react";

export default async function RepositorySettingsPage({
  params,
}: {
  params: Promise<{ repoId: string }>;
}) {
  const { repoId } = await params;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["repoSettings", repoId],
    queryFn: () => getRepoSettings(repoId),
  });

  return (
    <div className="container mx-auto py-8">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ErrorBoundary
          fallback={
            <div className="flex h-64 items-center justify-center">
              <span className="text-muted-foreground">
                Failed to load repository settings
              </span>
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2Icon className="size-8 animate-spin" />
              </div>
            }
          >
            <SettingsForm />
          </Suspense>
        </ErrorBoundary>
      </HydrationBoundary>
    </div>
  );
}
