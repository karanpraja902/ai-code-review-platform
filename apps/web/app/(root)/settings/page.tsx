import React from "react";
import SettingsContent from "./_components/SettingsContent";
import { getSettingsData } from "./_actions/getSettingsData";

const Page = async () => {
  // Fetch data on the server - Next.js will show loading.tsx during this time
  const initialData = await getSettingsData();

  return <SettingsContent initialData={initialData} />;
};

export default Page;