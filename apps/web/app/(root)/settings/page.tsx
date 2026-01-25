import React, { Suspense } from "react";
import SettingsContent from "./_components/SettingsContent";
import { getSettingsData } from "./_actions/getSettingsData";
import { Loader2Icon } from "lucide-react";

const Page = async () => {
  // Fetch data on the server
  const initialData = await getSettingsData();

  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2Icon className="h-6 w-6 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </div>
      }>
      <SettingsContent initialData={initialData} />
    </Suspense>
  );
};

export default Page;