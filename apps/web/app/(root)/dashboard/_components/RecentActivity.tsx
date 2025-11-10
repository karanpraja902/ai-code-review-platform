import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardData } from "@/types/dashboard";
import { GitBranch, Clock, Bug, GitPullRequest, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { statusClasses } from "@/lib/utils/statusClasses";

interface RecentActivityProps {
  data: DashboardData;
}

export const RecentActivity = ({ data }: RecentActivityProps) => {
  // Explicitly type the merged activities as a discriminated union
  type RepoActivityUI = DashboardData["recent_activity"]["full_repo"][number] & {
    type: "repository";
    date: Date;
  };
  type PRAcitivityUI = DashboardData["recent_activity"]["pull_request"][number] & {
    type: "pull_request";
    date: Date;
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  // Merge and sort all activities by date (typed union)
  const mergedActivities = [
    ...data.recent_activity.full_repo.map(repo => ({
      ...repo,
      type: 'repository' as const,
      date: new Date(repo.date)
    })),
    ...data.recent_activity.pull_request.map(pr => ({
      ...pr,
      type: 'pull_request' as const,
      date: new Date(pr.date)
    }))
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
        <div className="space-y-4 h-[400px] overflow-auto no-scrollbar">
          {mergedActivities.length > 0 ? (
            mergedActivities.map((activity, index) => (
              activity.type === 'pull_request' && activity.pr_url ? (
                <a
                  key={index}
                  href={activity.pr_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border rounded-md p-4 hover:bg-neutral-900 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-xs font-medium text-primary">PR</span>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm">{activity.repo_name}</h4>
                    </div>
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {activity.total_comments}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date.toISOString())}
                  </p>
                </a>
              ) : activity.type === 'repository' && activity.repo_id && activity.analysis_id ? (
                <Link
                  key={index}
                  href={`/analysis/${activity.repo_id}/${activity.analysis_id}`}
                  className="block border rounded-md p-4 hover:bg-neutral-900 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-800 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-800">REPO</span>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm">{activity.repo_name}</h4>
                      {activity.type === 'repository' && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <GitBranch className="h-3 w-3" />
                          {activity.branch}
                        </p>
                      )}
                    </div>
                    <Badge className={statusClasses(activity.state)}>
                      {activity.state}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {activity.total_github_issues_suggested} suggested, {activity.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      PRs: {activity.total_pull_request_suggested} suggested, {activity.pull_request_opened} opened
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(activity.date.toISOString())}
                  </p>
                </Link>
              ) : (
                <div key={index} className="border rounded-md p-4 hover:bg-neutral-900 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {activity.type === 'repository' ? (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-blue-600">REPO</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-medium text-green-600">PR</span>
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{activity.repo_name}</h4>
                      {activity.type === 'repository' && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <GitBranch className="h-3 w-3" />
                          {activity.branch}
                        </p>
                      )}
                    </div>
                  <Badge className={statusClasses(activity.state)}>
                    {activity.state}
                  </Badge>
                </div>
                
                {activity.type === 'repository' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Bug className="h-3 w-3" />
                      Issues: {activity.total_github_issues_suggested} suggested, {activity.github_issues_opened} opened
                    </div>
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-3 w-3" />
                      PRs: {activity.total_pull_request_suggested} suggested, {activity.pull_request_opened} opened
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Comments: {activity.total_comments}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(activity.date.toISOString())}
                </p>
                </div>
              )
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};