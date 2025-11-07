import React from "react";
import { Separator } from "@/components/ui/separator";
import { logger } from "@/lib/logger";
import { getPrAnalyses } from "../../analysis/_actions/getPrAnalyses";
import { CircleCheck, CircleX, Ellipsis, ExternalLink, GitPullRequestIcon } from "lucide-react";
import { statusClasses } from "@/lib/utils/statusClasses";
import { formatDistanceToNow } from "date-fns";
import { IconBrandGithub } from "@tabler/icons-react";

const PrAnalysisList = async () => {
  let items: Array<{
    repoUrl: string;
    model: string;
    status: string;
    pr_number?: number;
    pr_url?: string;
    pr_title?: string;
    createdAt?: string;
  }> = [];

  try {
    const res = await getPrAnalyses();
    items = res?.data || [];
  } catch (error) {
    logger.error("Failed to fetch PR analyses in PrAnalysisList", {
      error: error instanceof Error ? error.message : error,
    });
  }

  const repoName = (url?: string) => {
    if (!url) return "";
    try {
      const parts = url.replace("https://github.com/", "").split("/");
      return parts.slice(0, 2).join("/");
    } catch (_) {
      return url;
    }
  };

  // statusClasses imported from shared utility

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-12 px-3 py-2 text-xs text-muted-foreground">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Title</div>
        <div className="col-span-3">Repository</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Last Updated</div>
      </div>
      <Separator />

      {/* Rows */}
      <ul className="h-full">
        {items && items.length > 0 ? (
          items.map((item, idx) => (
            <React.Fragment key={`${item.repoUrl}-${item.pr_number}-${idx}`}>
              <li className="py-4">
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-1 text-sm text-muted-foreground">{item.pr_number}</div>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <GitPullRequestIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="truncate">
                      {item?.pr_url ? (
                        <a
                          href={item.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm truncate hover:underline"
                        >
                          {item?.pr_title
                            ? item.pr_title.length > 30
                              ? `${item.pr_title.slice(0, 30)}...`
                              : item.pr_title
                            : "Untitled Pull Request"}
                        </a>
                      ) : (
                        <span className="text-sm truncate">
                          {item?.pr_title
                            ? item.pr_title.length > 30
                              ? `${item.pr_title.slice(0, 30)}...`
                              : item.pr_title
                            : "Untitled Pull Request"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 text-sm truncate flex items-center gap-2">
                    <IconBrandGithub className="h-4 w-4 flex-shrink-0" />
                    {item?.repoUrl ? (
                      <a
                        href={item.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:underline"
                      >
                        {repoName(item.repoUrl)}
                      </a>
                    ) : (
                      <span className="truncate">{repoName(item.repoUrl)}</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs px-1.5 py-1 rounded-lg inline-block ${statusClasses(item.status)}`}>
                   
                      <span className="align-middle">{item.status}</span>
                        {item.status === "completed" && (
                        <CircleCheck className="h-3 w-3 inline-block ml-1" />
                      )}
                      {item.status === "error" && (
                        <CircleX className="h-3 w-3 inline-block ml-1" />
                      )}
                      {item.status === "running" && (
                        <Ellipsis className="h-3 w-3 inline-block ml-1 animate-pulse" />
                      )}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : "—"}
                    </div>
                    <a
                      href={item.pr_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </li>
              <Separator />
            </React.Fragment>
          ))
        ) : (
          <li className="h-full grid place-items-center text-base font-medium text-foreground">
            No PR analyses found
          </li>
        )}
      </ul>
    </div>
  );
};

export default PrAnalysisList;
