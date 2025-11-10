import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardData } from "@/types/dashboard";
import {
  GitBranch,
  Clock,
  Bug,
  GitPullRequest,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { statusClasses } from "@/lib/utils/statusClasses";

interface RecentActivityProps {
  data: DashboardData;
}

export const RecentActivity = ({ data }: RecentActivityProps) => {
  // Explicitly type the merged activities as a discriminated union
  type RepoActivityUI =
    DashboardData["recent_activity"]["full_repo"][number] & {
      type: "repository";
      date: Date;
    };
  type PRAcitivityUI =
    DashboardData["recent_activity"]["pull_request"][number] & {
      type: "pull_request";
      date: Date;
    };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  // Merge and sort all activities by date (typed union)
  const mergedActivities = [
    ...data.recent_activity.full_repo.map((repo) => ({
      ...repo,
      type: "repository" as const,
      date: new Date(repo.date),
    })),
    ...data.recent_activity.pull_request.map((pr) => ({
      ...pr,
      type: "pull_request" as const,
      date: new Date(pr.date),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="no-scrollbar h-[400px] space-y-4 overflow-auto">
          {mergedActivities.length > 0 ? (
            mergedActivities.map((activity, index) =>
              activity.type === "pull_request" && activity.pr_url ? (
                <a
                  key={index}
                  href={activity.pr_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="bg-primary h-2 w-2 rounded-full"></div>
                          <span className="text-primary text-xs font-medium">
                            PR
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-medium">
                        {activity.repo_name}
                      </h4>
                    </div>
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  <div className="mb-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {activity.total_comments}
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date.toISOString())}
                  </p>
                </a>
              ) : activity.type === "repository" &&
                activity.repo_id &&
                activity.analysis_id ? (
                <Link
                  key={index}
                  href={`/analysis/${activity.repo_id}/${activity.analysis_id}`}
                  className="block cursor-pointer rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-800"></div>
                          <span className="text-xs font-medium text-blue-800">
                            REPO
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-medium">
                        {activity.repo_name}
                      </h4>
                      {activity.type === "repository" && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <GitBranch className="h-3 w-3" />
                          {activity.branch}
                        </p>
                      )}
                    </div>
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {activity.total_github_issues_suggested}{" "}
                      suggested, {activity.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      PRs: {
                        activity.total_pull_request_suggested
                      } suggested, {activity.pull_request_opened} opened
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date.toISOString())}
                  </p>
                </Link>
              ) : (
                <div
                  key={index}
                  className="cursor-pointer rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {activity.type === "repository" ? (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-medium text-blue-600">
                              REPO
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-medium text-green-600">
                              PR
                            </span>
                          </div>
                        )}
                      </div>
                      <h4 className="text-sm font-medium">
                        {activity.repo_name}
                      </h4>
                      {activity.type === "repository" && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <GitBranch className="h-3 w-3" />
                          {activity.branch}
                        </p>
                      )}
                    </div>
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  {activity.type === "repository" ? (
                    <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Bug className="h-3 w-3" />
                        Issues: {activity.total_github_issues_suggested}{" "}
                        suggested, {activity.github_issues_opened} opened
                      </div>
                      <div className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        PRs: {
                          activity.total_pull_request_suggested
                        } suggested, {activity.pull_request_opened} opened
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Comments: {activity.total_comments}
                      </div>
                    </div>
                  )}

                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date.toISOString())}
                  </p>
                </div>
              ),
            )
          ) : (
            <p className="py-4 text-center text-gray-500">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
