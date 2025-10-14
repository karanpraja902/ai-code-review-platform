"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const EarlyAccessCard = ({ onRequest, onClose }: { onRequest: () => void; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-w-md w-full rounded-none border-[#333333]/50 bg-black/40 backdrop-blur-3xl shadow-zinc-950/5">
        <CardHeader>
          <h3 className="text-xl font-semibold">Get Early Access</h3>
          <div className="text-sm text-muted-foreground mt-2 space-y-2">
            <p>
              Unlock early access to upcoming features, faster support, and personalized onboarding.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Priority feature rollouts</li>
              <li>Direct feedback loop with the team</li>
              <li>Beta-only integrations and experiments</li>
            </ul>
            <p className="text-xs">We’ll email you a confirmation link to activate access.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Not now</Button>
            <Button onClick={() => onRequest()}>Request Early Access</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};