"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestUpgrade } from "@/app/(root)/dashboard/_actions/requestUpgrade";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UpgradePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  const [startupName, setStartupName] = useState("");
  const [startupUrl, setStartupUrl] = useState("");
  const [description, setDescription] = useState("");
  const [requestStatus, setRequestStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade Plan request</DialogTitle>
          <DialogDescription>
            Since we are in beta mode, upgradation are only for startups/companies. <br />
            <br />
            <ul className="list-disc pl-5 text-sm mb-5">
              <li>Create teams and invite members</li>
              <li>Increase limits: PR analysis (20/day) and repo analysis (5/day)</li>
            </ul>
            For assistance or a quick demo,
            <a href="https://cal.com/karanpraja902/ai-code-review" target="_blank" className="underline text-primary"> you can book a time </a>
            — I’ll be happy to help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-2">
          <div className="space-y-1">
            <p className="text-sm">Startup name</p>
            <Input
              placeholder="e.g. Acme Corp"
              value={startupName}
              onChange={(e) => setStartupName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm">Startup URL (where you’ll use AI Code Review)</p>
            <Input
              placeholder="https://github.com/acme"
              value={startupUrl}
              onChange={(e) => setStartupUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm">Description (optional)</p>
            <textarea
              placeholder="Briefly describe your organization and needs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>
          <div>
            <Button
              className="w-full"
              disabled={requestStatus === "submitting" || !startupName || !startupUrl}
              onClick={async () => {
                try {
                  setRequestStatus("submitting");
                  const res = await requestUpgrade({ startupName, startupUrl, description });
                  if (res?.success) {
                    setRequestStatus("success");
                    onOpenChange(false);
                  } else {
                    setRequestStatus("error");
                  }
                } catch {
                  setRequestStatus("error");
                }
              }}
            >
              {requestStatus === "submitting" ? "Requesting…" : "Request"}
            </Button>
            <p className="text-xs text-muted-foreground mt-6">
              Once requested, we will verify and your plan will be upgraded in 6–12 hours, Thanks for choosing AI Code Review.
            </p>
            {requestStatus === "success" && (
              <p className="text-xs text-green-600 mt-1">Request received — we’ll get back shortly.</p>
            )}
            {requestStatus === "error" && (
              <p className="text-xs text-red-600 mt-1">Failed to submit request, please try again.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}