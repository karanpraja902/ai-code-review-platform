import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DashboardData } from "@/types/dashboard";

import {
  GitBranch,
  Clock,
  Bug,
  GitPullRequest,
  MessageSquare,
  Github,
  Monitor,
  Code2,
  CircleCheck,
  CircleX,
  Ellipsis,
  SkipForward,
  AlertTriangle,
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
    };
  type PRAcitivityUI =
    DashboardData["recent_activity"]["pull_request"][number] & {
      type: "pull_request";
      pr_title?: string;
      pr_number?: number;
    };
  type ExtensionActivityUI =
    DashboardData["recent_activity"]["extension"][number] & {
      type: "extension";
    };

  const ActivityHeader = ({
    activity,
  }: {
    activity: RepoActivityUI | PRAcitivityUI | ExtensionActivityUI;
  }) => (
    <div className="flex-1">
      <div className="mb-1 flex items-center gap-2">
        {activity.type === "pull_request" ? (
          <><GitPullRequest className="text-primary h-3 w-3" /> <span className="text-xs font-semibold text-primary">PR Review</span></>
        ) : activity.type === "extension" ? (
          <><Monitor className="text-primary h-3 w-3" /> <span className="text-xs font-semibold text-primary">Extension Review</span></>
        ) : (
          <><Github className="text-primary h-3 w-3" /> <span className="text-xs font-semibold text-primary">Repo Review</span></>
        )}
      </div>
      {activity.type === "pull_request" ? (
        <>
          <h4 className="text-sm font-medium whitespace-pre-wrap">
            {(() => {
              const prNum =
                (activity as PRAcitivityUI).pr_number ??
                getPrNumberFromUrl((activity as PRAcitivityUI).pr_url);
              const title =
                (activity as PRAcitivityUI).pr_title ?? "Untitled Pull Request";
              return prNum ? `#${prNum} ${title}` : title;
            })()}
          </h4>
          <p className="mt-1 text-xs break-all">{activity.repo_name}</p>
        </>
      ) : (
        <>
          <h4 className="text-sm font-medium">{activity.repo_name}</h4>
          {activity.type === "repository" && (
            <p className="mt-1 flex items-center gap-1 text-xs">
              <GitBranch className="h-3 w-3" />
              {activity.branch}
            </p>
          )}
        </>
      )}
    </div>
  );

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getPrNumberFromUrl = (url?: string): number | undefined => {
    if (!url) return undefined;
    try {
      const match = url.match(/\/pulls?\/(\d+)/);
      return match ? Number(match[1]) : undefined;
    } catch {
      return undefined;
    }
  };

  // Merge and sort all activities by date (typed union)
  const mergedActivities: Array<RepoActivityUI | PRAcitivityUI | ExtensionActivityUI> = [
    ...data.recent_activity.full_repo.map((repo) => ({
      ...repo,
      type: "repository" as const,
    })),
    ...data.recent_activity.pull_request.map((pr) => ({
      ...pr,
      type: "pull_request" as const,
    })),
    ...(data.recent_activity.extension || []).map((ext) => ({
      ...ext,
      type: "extension" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="no-scrollbar max-h-[450px] space-y-4 overflow-auto">
          {mergedActivities.length > 0 ? (
            mergedActivities.map((activity, index) =>
              activity.type === "pull_request" ? (
                <a
                  key={index}
                  href={activity?.pr_url || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block cursor-pointer rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <ActivityHeader activity={activity} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`cursor-help inline-flex items-center gap-1 ${statusClasses(activity.state)}`}>
                          {activity.state}
                          {activity.state === "completed" && <CircleCheck className="h-3 w-3" />}
                          {activity.state === "error" && <CircleX className="h-3 w-3" />}
                          {activity.state === "running" && <Ellipsis className="h-3 w-3 animate-pulse" />}
                          {activity.state === "skipped" && <SkipForward className="h-3 w-3" />}
                          {activity.state === "interrupted" && <AlertTriangle className="h-3 w-3" />}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {["error", "skipped", "interrupted"].includes(activity.state) ? (
                          <span>{(activity as any).errorLogs || `${activity.state} - No details available`}</span>
                        ) : (
                          <span>
                            {activity.state === "completed" ? "Completed" : "Started"}{" "}
                            {formatDate(activity.date)}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {activity.total_comments}
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date)}
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
                    <ActivityHeader activity={activity} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`cursor-help inline-flex items-center gap-1 ${statusClasses(activity.state)}`}>
                          {activity.state}
                          {activity.state === "completed" && <CircleCheck className="h-3 w-3" />}
                          {activity.state === "error" && <CircleX className="h-3 w-3" />}
                          {activity.state === "running" && <Ellipsis className="h-3 w-3 animate-pulse" />}
                          {activity.state === "skipped" && <SkipForward className="h-3 w-3" />}
                          {activity.state === "interrupted" && <AlertTriangle className="h-3 w-3" />}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {["error", "skipped", "interrupted"].includes(activity.state) ? (
                          <span>{(activity as any).errorLogs || `${activity.state} - No details available`}</span>
                        ) : (
                          <span>
                            {activity.state === "completed" ? "Completed" : "Started"}{" "}
                            {formatDate(activity.date)}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {activity.total_github_issues_suggested}{" "}
                      suggested, {activity.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      Pull Requests: {
                        activity.total_pull_request_suggested
                      } suggested, {activity.pull_request_opened} opened
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date)}
                  </p>
                </Link>
              ) : activity.type === "extension" && activity.analysis_id ? (
                <div
                  key={index}
                  className="block cursor-default rounded-md border p-4 transition-colors hover:bg-neutral-100 hover:dark:bg-neutral-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <ActivityHeader activity={activity} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className={`cursor-help inline-flex items-center gap-1 ${statusClasses(activity.state)}`}>
                          {activity.state}
                          {activity.state === "completed" && <CircleCheck className="h-3 w-3" />}
                          {activity.state === "error" && <CircleX className="h-3 w-3" />}
                          {activity.state === "running" && <Ellipsis className="h-3 w-3 animate-pulse" />}
                          {activity.state === "skipped" && <SkipForward className="h-3 w-3" />}
                          {activity.state === "interrupted" && <AlertTriangle className="h-3 w-3" />}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {["error", "skipped", "interrupted"].includes(activity.state) ? (
                          <span>{(activity as any).error_logs || `${activity.state} - No details available`}</span>
                        ) : (
                          <span>
                            {activity.state === "completed" ? "Completed" : "Started"}{" "}
                            {formatDate(activity.date)}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {activity.total_comments}
                    </div>
                    <div className="flex items-center gap-1">
                      <Code2 className="h-3 w-3" />
                      Lines Reviewed: {activity.reviewed_lines}
                    </div>
                  </div>

                  <p className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date)}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">You don&apos;t have any activity yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Once you run any analysis, your recent activities will appear here</p>
                </div>
              ),
            )
          ) : (
<div className="py-8 text-center">
                  <p className="text-muted-foreground">You don&apos;t have any activity yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Once you run any analysis, your recent activities will appear here</p>
                </div>          )}
        </div>
      </CardContent>
    </Card>
  );
};
