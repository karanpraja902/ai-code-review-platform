"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, CheckIcon, AlertCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  syncRepositories,
  SyncRepositoriesResult,
} from "../_actions/syncRepositories";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SyncRepositoriesButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<
    "success" | "error" | null
  >(null);
  const router = useRouter();

  const handleSync = useCallback(async () => {
    setIsLoading(true);
    setLastSyncStatus(null);

    try {
      // Check if there's a pending team ID from GitHub redirect
      const pendingTeamId = localStorage.getItem("ai-code-review_pending_team_id");
      
      const result: SyncRepositoriesResult = await syncRepositories(pendingTeamId || undefined);

      // Clear the pending team ID after sync
      if (pendingTeamId) {
        localStorage.removeItem("ai-code-review_pending_team_id");
        localStorage.removeItem("ai-code-review_pending_team_slug");
      }

      if (result.success) {
        setLastSyncStatus("success");
        toast.success(result.message);

        // Show additional details if available
        if (result.details && result.details.totalInstallations > 0) {
          const { updated, created, totalRepositories, totalInstallations, addedToTeam } =
            result.details;

          if (updated > 0 || created > 0) {
            let message = `Synced ${totalRepositories} repositories across ${totalInstallations} installation(s). Updated: ${updated}, Created: ${created}`;
            if (addedToTeam && addedToTeam > 0) {
              message += `, Added to team: ${addedToTeam}`;
            }
            toast.success(message);
          }
        }

        router.refresh();
      } else {
        setLastSyncStatus("error");
        toast.error(result.message);

        // Show specific errors if available
        if (result.details && result.details.errors.length > 0) {
          const errorCount = result.details.errors.length;
          if (errorCount <= 3) {
            // Show individual errors for small numbers
            result.details.errors.forEach((error) => {
              toast.error(error, { duration: 5000 });
            });
          } else {
            // Show summary for many errors
            toast.error(
              `${errorCount} sync errors occurred. Check console for details.`
            );
            console.error("Sync errors:", result.details.errors);
          }
        }
      }
    } catch (error) {
      setLastSyncStatus("error");
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sync repositories";
      toast.error(errorMessage);
      console.error("Sync error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Check for pending team ID on mount and trigger sync if found
  useEffect(() => {
    const pendingTeamId = localStorage.getItem("ai-code-review_pending_team_id");
    if (pendingTeamId) {
      // Auto-trigger sync when returning from GitHub with a pending team
      handleSync();
    }
  }, [handleSync]);

  return (
    <Button onClick={handleSync} disabled={isLoading} variant="outline">
      {isLoading ? (
        <RefreshCwIcon className="animate-spin" />
      ) : lastSyncStatus === "success" ? (
        <CheckIcon className="text-green-600" />
      ) : lastSyncStatus === "error" ? (
        <AlertCircleIcon className="text-red-600" />
      ) : (
        <RefreshCwIcon />
      )}
      <span className={cn("ml-1 hidden lg:block", isLoading && "opacity-50")}>
        {isLoading ? "Syncing..." : "Sync Repositories"}
      </span>
    </Button>
  );
};

export default SyncRepositoriesButton;
