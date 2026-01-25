export interface DashboardData {
  total_repo_added: number;
  full_repo_review: {
    total_reviews: number;
    total_github_issues_suggested: number;
    github_issues_opened: number;
    total_pull_request_suggested: number;
    pull_request_opened: number;
  };
  pr_reviews: {
    total_reviews: number;
    total_comments: number;
  };
  recent_activity: {
    pull_request: PullRequestActivity[];
    full_repo: FullRepoActivity[];
    extension: ExtensionActivity[];
  };
  trends?: {
    daily_full_repo_reviews: Array<{ date: string; count: number }>;
    daily_pr_reviews: Array<{ date: string; count: number }>;
    daily_pr_comments_avg?: Array<{ date: string; count: number }>;
    daily_reviewed_lines_of_code?: Array<{ date: string; count: number }>;
    daily_pr_merge_time_avg?: Array<{ date: string; count: number }>;
    range_days: number;
    // Summary metrics calculated on backend
    total_pr_reviews?: number;
    avg_merge_time_hours?: number;
    avg_comments_per_pr?: number;
    total_lines_reviewed?: number;
  };
}

export interface PullRequestActivity {
  repo_name: string;
  state: string;
  date: string;
  total_comments: number;
  pr_title?: string;
  pr_number?: number;
  pr_url?: string;
  repo_id?: string;
  analysis_id?: string;
}

export interface FullRepoActivity {
  repo_name: string;
  branch: string;
  state: string;
  date: string;
  total_github_issues_suggested: number;
  github_issues_opened: number;
  total_pull_request_suggested: number;
  pull_request_opened: number;
  repo_id?: string;
  analysis_id?: string;
}

export interface ExtensionActivity {
  repo_name: string;
  state: string;
  date: string;
  total_comments: number;
  reviewed_lines: number;
  repo_id?: string;
  analysis_id: string;
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}