import React from "react";
import CustomContextContent from "../../custom-context/_components/CustomContextContent";
import { getMyTeams } from "@/_actions/user-actions";

interface PageProps {
  params: Promise<{ teamSlug: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { teamSlug } = await params;
  const myTeams = await getMyTeams();
    const currentTeam = Array.isArray(myTeams)
      ? myTeams.find((t: any) => t?.slug === teamSlug)
      : null;
    const isTeamAdmin = currentTeam?.role === "admin";
    const currentTeamId = currentTeam?._id;
  return <CustomContextContent scope="team" teamSlug={teamSlug} teamId={currentTeamId} />;
};

export default Page;
