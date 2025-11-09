import React from "react";
import { getRepository } from "../_actions/getRepository";
import { GithubRepository } from "@/types/types";
import { Separator } from "@/components/ui/separator";
import RepositoryItem from "./RepositoryItem";
import { logger } from "@/lib/logger";
import { getUserInstallations } from "@/_actions/user-actions";
import ConnectGithubCard from "../../_components/connect-github-card";

type RepoScope = "user" | "team";

const RepositoryList = async ({
  query,
  scope,
  teamId,
  orgSlug
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
      error: error instanceof Error ? error.message : error 
    });
  }

  try {
    const ins = await getUserInstallations();
    installations = Array.isArray(ins) ? ins : [];
  } catch (_) {
    installations = [];
  }

  return (
    <ul className="h-full">
      {(!installations || installations.length === 0) ? (
        <li className="h-full w-full mt-2">
          <ConnectGithubCard />
        </li>
      ) : data && data.length > 0 ? (
        data.map((repo) => (
          <React.Fragment key={repo._id}>
            <li className="py-5">
              <RepositoryItem repo={repo} teamId={teamId} />
            </li>
            <Separator />
          </React.Fragment>
        ))
      ) : (
        <li className="h-full grid place-items-center text-base font-medium text-foreground">
          No repository added
        </li>
      )}
    </ul>
  );
};

export default RepositoryList;
