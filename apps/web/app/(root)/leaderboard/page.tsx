import React from "react";
import LeaderboardTable from "./_components/LeaderboardTable";

const Page = () => {
  return (
    <div className="h-svh max-w-8xl w-full mx-auto p-5">
      <div className="h-full">
        <div className="flex items-center justify-between gap-2 border-b pb-4 mb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-medium">Team Leaderboard</h2>
            <p className="text-sm text-muted-foreground">
              Top contributors by PRs created and lines committed.
            </p>
          </div>
        </div>

        <div className="h-[calc(100%-3rem)]">
          <LeaderboardTable />
        </div>
      </div>
    </div>
  );
};

export default Page;
