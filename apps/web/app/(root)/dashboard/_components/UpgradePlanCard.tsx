"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { UpgradePlanDialog } from "@/components/shared/UpgradePlanDialog";

const UpgradePlanCard = () => {
  return (
    <Card className="relative mx-auto mb-8 w-full overflow-hidden p-5">
      <CardHeader className="p-0">
        <CardTitle className="text-xl">
          You are currently using free plan
        </CardTitle>
        <CardDescription className="text-sm">
          If you are startup/company or team, you can upgrade your plan for free
          to access teams feature and increase limits for analyses.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <UpgradePlanDialog />
      </CardContent>
    </Card>
  );
};

export default UpgradePlanCard;
