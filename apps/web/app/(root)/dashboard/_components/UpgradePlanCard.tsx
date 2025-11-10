"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradePlanDialog } from "@/components/shared/UpgradePlanDialog";
import { TrendingUp } from "lucide-react";

const UpgradePlanCard = () => {
  const [open, setOpen] = useState(false);

  return (
    <Card className="relative overflow-hidden mx-auto mb-8 p-5 w-full">
      <CardHeader className="p-0 ">
        <CardTitle className="text-xl">You are currently using free plan</CardTitle>
        <CardDescription className="text-sm">
          If you are startup/company or team, you can upgrade your plan for free to access teams feature and increase limits for analyses.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Button className="cursor-pointer" onClick={() => setOpen(true)}>
                        <TrendingUp className="h-4 w-4" />

          Upgrade for free
        </Button>
      </CardContent>

      <UpgradePlanDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
};

export default UpgradePlanCard;