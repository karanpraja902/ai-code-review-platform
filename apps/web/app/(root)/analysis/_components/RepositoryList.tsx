import React from "react";
import { getRepository } from "../_actions/getRepository";
import { GithubRepository } from "@/types/types";
import { Separator } from "@/components/ui/separator";
import RepositoryItem from "./RepositoryItem";
import { logger } from "@/lib/logger";
import { getUserInstallations } from "@/_actions/user-actions";
import ConnectGithubCard from "../../_components/connect-github-card";
import { FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type RepoScope = "user" | "team";

const EmptyRepositoryState = () => {
  
  return (
    <div className="text-center max-w-md mx-auto min-h-[60vh] flex flex-col justify-center">
      <div className="mb-4">
        <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Repositories Added</h3>
      <p className="text-muted-foreground text-sm mb-6">
        Add your repositories to get started with AI Code Review
      </p>
      <ul className="text-left text-sm text-muted-foreground space-y-3 mb-6">
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>Add repositories here to automatically enable PR analysis</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-500 mt-0.5">•</span>
          <span>You can enable/disable PR analysis for each repo from its settings</span>
        </li>
      </ul>
     <div className="mt-6">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/interact">See how to interact with AI Code Review</Link>
                    </Button>
                  </div>
    </div>
  );
};

const RepositoryList = async ({
  query,
  scope,
  teamId,
  orgSlug,
}: {
  query: string;
  scope: RepoScope;
  teamId?: string;
  orgSlug?: string;
}) => {
  let data: GithubRepository[] | undefined;
  let installations: any[] = [];

  try {
    const res = await getRepository(query, scope, teamId, orgSlug);
    data = (res?.data || []).reverse();
  } catch (error) {
    logger.error("Failed to fetch repositories in RepositoryList", {
      query,
      scope,
      teamId,
      error: error instanceof Error ? error.message : error,
    });
  }

  try {
    const ins = await getUserInstallations();
    installations = Array.isArray(ins) ? ins : [];
  } catch (_) {
    installations = [];
  }

  return (
    <ul className="h-full w-full">
      {scope === "team" ? (
        data && data.length > 0 ? (
          data.map((repo) => (
            <React.Fragment key={repo._id}>
              <li className="w-full py-5">
                <RepositoryItem repo={repo} teamId={teamId} />
              </li>
              <Separator />
            </React.Fragment>
          ))
        ) : (
          <li className="h-full grid place-items-center">
            <EmptyRepositoryState />
          </li>
        )
      ) : !installations || installations.length === 0 ? (
        <li className="mt-2 h-full w-full">
          <ConnectGithubCard />
        </li>
      ) : data && data.length > 0 ? (
        data.map((repo) => (
          <React.Fragment key={repo._id}>
            <li className="w-full py-5">
              <RepositoryItem repo={repo} teamId={teamId} />
            </li>
            <Separator />
          </React.Fragment>
        ))
      ) : (
        <li className="h-full grid place-items-center">
          <EmptyRepositoryState />
        </li>
      )}
    </ul>
  );
};

export default RepositoryList;
