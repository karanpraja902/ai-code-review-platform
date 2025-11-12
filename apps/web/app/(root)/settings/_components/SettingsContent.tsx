"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { _config } from "@/lib/_config";
import { toast } from "sonner";

type Scope = "user" | "team";

export interface SettingsContentProps {
  scope?: Scope;
  teamSlug?: string;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ scope = "user", teamSlug }) => {
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const { orgId, orgRole, getToken } = useAuth();
  const storageKey = useMemo(() => `settings:allowAllPRs:${scope === "team" ? teamSlug ?? "team" : "user"}`, [scope, teamSlug]);
  const [bulkSettings, setBulkSettings] = useState<{
    trackGithubPullRequests: boolean;
    trackGithubIssues: boolean;
    analysisRequired: boolean;
    raiseIssues: boolean;
    autoFixBugs: boolean;
  }>({
    trackGithubPullRequests: false,
    trackGithubIssues: false,
    analysisRequired: true,
    raiseIssues: false,
    autoFixBugs: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        setBulkSettings((prev) => ({ ...prev, trackGithubPullRequests: raw === "true" }));
      }
    } catch (_) {}
  }, [storageKey]);

  const handleToggle = (key: keyof typeof bulkSettings, checked: boolean) => {
    setBulkSettings((prev) => ({ ...prev, [key]: checked }));
    setDirty(true);
    if (key === "trackGithubPullRequests") {
      try {
        localStorage.setItem(storageKey, String(checked));
      } catch (_) {}
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      if (scope === "team" && orgId) {
        headers["X-Team-Id"] = orgId;
      }
      const body = {
        scope,
        settings: {
          trackGithubPullRequests: bulkSettings.trackGithubPullRequests,
          trackGithubIssues: bulkSettings.trackGithubIssues,
          analysisRequired: bulkSettings.analysisRequired,
          raiseIssues: bulkSettings.raiseIssues,
          autoFixBugs: bulkSettings.autoFixBugs,
        },
      };
      const res = await fetch(`${_config.API_BASE_URL}/api/github/repository/settings/bulk`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to save settings");
      } else {
        const data = await res.json();
        toast.success(data.message || "Settings updated");
        setDirty(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-svh max-w-8xl w-full mx-auto p-5">
      <div className="h-full">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-2xl font-medium">Settings</h2>
        </div>

        <div className="grid grid-row-1 lg:grid-row-2 gap-6 mt-4 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user?.fullName || user?.username || "—"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{user?.primaryEmailAddress?.emailAddress || "—"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user?.id || "—"}</span>
              </div>
           
            </CardContent>
          </Card>

             {scope === "team" && (
                <Card>
                     <CardHeader>
              <CardTitle className="text-lg">Team Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team Name</span>
                    <span className="font-medium">{organization?.name || teamSlug || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team Slug</span>
                    <span className="font-mono text-xs">{organization?.slug || teamSlug || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Team ID</span>
                    <span className="font-mono text-xs">{organization?.id || orgId || "—"}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Your Role</span>
                    <span className="font-medium">{membership?.role || orgRole || "—"}</span>
                  </div>
                  </CardContent>
                </Card>
              )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pull Request Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="allow-all-repos-pr-analysis"
                  checked={bulkSettings.trackGithubPullRequests}
                  onCheckedChange={(v: boolean) => handleToggle("trackGithubPullRequests", Boolean(v))}
                />
                <Label htmlFor="allow-all-repos-pr-analysis" className="cursor-pointer">
                  {scope === "team" ? "Allow PR analysis for all team repositories" : "Allow PR analysis for all personal repositories"}
                </Label>
              </div>
              {/* <div className="flex items-center gap-3">
                <Checkbox
                  id="track-github-issues"
                  checked={bulkSettings.trackGithubIssues}
                  onCheckedChange={(v: boolean) => handleToggle("trackGithubIssues", Boolean(v))}
                />
                <Label htmlFor="track-github-issues" className="cursor-pointer">
                  {scope === "team" ? "Track GitHub issues across team repositories" : "Track GitHub issues across personal repositories"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="analysis-required"
                  checked={bulkSettings.analysisRequired}
                  onCheckedChange={(v: boolean) => handleToggle("analysisRequired", Boolean(v))}
                />
                <Label htmlFor="analysis-required" className="cursor-pointer">
                  {scope === "team" ? "Require analysis before merges (team)" : "Require analysis before merges (personal)"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="raise-issues"
                  checked={bulkSettings.raiseIssues}
                  onCheckedChange={(v: boolean) => handleToggle("raiseIssues", Boolean(v))}
                />
                <Label htmlFor="raise-issues" className="cursor-pointer">
                  {scope === "team" ? "Automatically create issues (team)" : "Automatically create issues (personal)"}
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="auto-fix-bugs"
                  checked={bulkSettings.autoFixBugs}
                  onCheckedChange={(v: boolean) => handleToggle("autoFixBugs", Boolean(v))}
                />
                <Label htmlFor="auto-fix-bugs" className="cursor-pointer">
                  {scope === "team" ? "Automatically open PRs for simple fixes (team)" : "Automatically open PRs for simple fixes (personal)"}
                </Label>
              </div> */}
              <div className="flex items-center justify-center pt-2">
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {scope === "team"
                  ? "This applies to the current team’s repositories."
                  : "This applies to your personal repositories."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;