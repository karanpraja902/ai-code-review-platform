import React, { Suspense } from "react";
import PrAnalysisList from "./_components/PrAnalysisList";

const Page = async () => {
  return (
    <div className="h-svh max-w-8xl w-full mx-auto p-5">
      <div className="h-full">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-2xl font-medium">PR Analyses</h2>
      </div>

        <div className="h-[calc(100%-3rem)] overflow-y-auto output-scrollbar">
          <Suspense fallback={<div className="p-4 text-sm">Loading PR analyses...</div>}>
            <PrAnalysisList />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Page;
