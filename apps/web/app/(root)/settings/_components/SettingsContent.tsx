"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useUser, useOrganization, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
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
    trackGithubPullRequests: true,
    trackGithubIssues: false,
    analysisRequired: true,
    raiseIssues: false,
    autoFixBugs: false,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repoModel, setRepoModel] = useState<string>("");
  const [prModel, setPrModel] = useState<string>("");
  const [repoModelName, setRepoModelName] = useState<string>("");
  const [prModelName, setPrModelName] = useState<string>("");
  const [availableRepoModels, setAvailableRepoModels] = useState<Array<{ _id: string; name: string; provider: string; input_context_limit?: number }>>([]);
  const [availablePrModels, setAvailablePrModels] = useState<Array<{ _id: string; name: string; provider: string; input_context_limit?: number }>>([]);

  // Helper function to format context limit (200000 → 200k, 1000000 → 1M)
  const formatContextLimit = (limit?: number): string => {
    if (!limit) return "";
    if (limit >= 1000000) {
      return `${(limit / 1000000).toFixed(limit % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (limit >= 1000) {
      return `${(limit / 1000).toFixed(limit % 1000 === 0 ? 0 : 1)}k`;
    }
    return String(limit);
  };
  const [loadingRepoModels, setLoadingRepoModels] = useState<boolean>(false);
  const [loadingPrModels, setLoadingPrModels] = useState<boolean>(false);
  const [severityThreshold, setSeverityThreshold] = useState<number>(1); // 0 = LOW, 1 = MED, 2 = HIGH
  const [prSummarySettings, setPrSummarySettings] = useState({
    enabled: true,
    sequenceDiagram: true,
    issueTables: true,
    impactAsessment: true,
    vibeCheckRap: true,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        setBulkSettings((prev) => ({ ...prev, trackGithubPullRequests: raw === "true" }));
      }
    } catch (_) {}
  }, [storageKey]);


  useEffect(() => {
    const initUserModels = async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        };
        if (scope === "team" && orgId) {
          headers["X-Team-Id"] = orgId;
        }

        // Fetch settings and available models in parallel
        const settingsUrl = scope === "team"
          ? `${_config.API_BASE_URL}/api/team/settings`
          : `${_config.API_BASE_URL}/api/user/settings`;
        
        const [settingsRes, repoModelsRes, prModelsRes] = await Promise.all([
          fetch(settingsUrl, { headers }),
          fetch(`${_config.API_BASE_URL}/api/ai/models?mode=full_repo_analysis`, { headers }),
          fetch(`${_config.API_BASE_URL}/api/ai/models?mode=pr_analysis`, { headers }),
        ]);

        // Process settings
        if (settingsRes.ok) {
          const settingsJson = await settingsRes.json();
          const s = (settingsJson?.data || {}) as any;
          
          // Extract model IDs and names from settings
          const repoModelId = typeof s.defaultModelRepo === "string" ? s.defaultModelRepo : "";
          const prModelId = typeof s.defaultModelPr === "string" ? s.defaultModelPr : "";
          const repoModelName = typeof s.defaultModelRepoName === "string" ? s.defaultModelRepoName : "";
          const prModelName = typeof s.defaultModelPrName === "string" ? s.defaultModelPrName : "";
          
          // Extract commentSeverity (default to 1 = MED)
          const savedSeverity = typeof s.commentSeverity === "number" ? s.commentSeverity : 1;
          
          // Extract prSummarySettings (default to all enabled)
          const savedPrSummarySettings = s.prSummarySettings || {};
          
          setRepoModel(repoModelId);
          setPrModel(prModelId);
          setRepoModelName(repoModelName);
          setPrModelName(prModelName);
          setSeverityThreshold(savedSeverity);
          setPrSummarySettings({
            enabled: savedPrSummarySettings.enabled ?? true,
            sequenceDiagram: savedPrSummarySettings.sequenceDiagram ?? true,
            issueTables: savedPrSummarySettings.issueTables ?? true,
            impactAsessment: savedPrSummarySettings.impactAsessment ?? true,
            vibeCheckRap: savedPrSummarySettings.vibeCheckRap ?? true,
          });
        }

        // Process available models
        if (repoModelsRes.ok) {
          const repoModelsJson = await repoModelsRes.json();
          const repoModels = Array.isArray(repoModelsJson?.data) ? repoModelsJson.data : [];
          setAvailableRepoModels(repoModels);
        }

        if (prModelsRes.ok) {
          const prModelsJson = await prModelsRes.json();
          const prModels = Array.isArray(prModelsJson?.data) ? prModelsJson.data : [];
          setAvailablePrModels(prModels);
        }
      } catch (_) {}
    };
    initUserModels();
  }, [getToken, scope, orgId]);

  const fetchAvailableRepoModels = async () => {
    try {
      setLoadingRepoModels(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      if (scope === "team" && orgId) {
        headers["X-Team-Id"] = orgId;
      }
      const res = await fetch(`${_config.API_BASE_URL}/api/ai/models?mode=full_repo_analysis`, { headers });
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        setAvailableRepoModels(arr);
      }
    } catch (_) {}
    finally {
      setLoadingRepoModels(false);
    }
  };

  const fetchAvailablePrModels = async () => {
    try {
      setLoadingPrModels(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      if (scope === "team" && orgId) {
        headers["X-Team-Id"] = orgId;
      }
      const res = await fetch(`${_config.API_BASE_URL}/api/ai/models?mode=pr_analysis`, { headers });
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        setAvailablePrModels(arr);
      }
    } catch (_) {}
    finally {
      setLoadingPrModels(false);
    }
  };

  const handleToggle = (key: keyof typeof bulkSettings, checked: boolean) => {
    setBulkSettings((prev) => ({ ...prev, [key]: checked }));
    setDirty(true);
    if (key === "trackGithubPullRequests") {
      try {
        localStorage.setItem(storageKey, String(checked));
      } catch (_) {}
    }
  };

  // Auto-save when model or comment severity changes
  useEffect(() => {
    // Skip auto-save if not dirty (prevents save on initial load)
    if (!dirty) return;
    
    const timeoutId = setTimeout(() => {
      handleSave();
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prModel, repoModel, severityThreshold, prSummarySettings]);

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
      const settingsUrl = scope === "team"
        ? `${_config.API_BASE_URL}/api/team/settings`
        : `${_config.API_BASE_URL}/api/user/settings`;
      const payload = {
        ...(repoModel ? { defaultModelRepoId: repoModel } : {}),
        ...(prModel ? { defaultModelPrId: prModel } : {}),
        commentSeverity: severityThreshold,
        prSummarySettings,
      };
      const settingsRes = await fetch(settingsUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!settingsRes.ok) {
        const err = await settingsRes.json().catch(() => ({}));
        toast.error(err.message || "Failed to save model settings");
        return;
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

          {/* <Card>
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
              <div className="flex items-center gap-3">
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
              </div>
             
            
            </CardContent>
          </Card> */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
            </CardHeader>
            <CardContent >
              <div>
                <div className="flex item-start justify-between gap-10 w-full">
                   <div className="flex items-center gap-2">
                  <Label htmlFor="comment-intensity">Comment Severity</Label>
                  <InfoTooltip 
                    content="Controls the minimum severity threshold for comments. Lower settings show more suggestions, higher settings focus on critical issues only."
                    side="right"
                  />
                </div>
                <div className="space-y-2 w-1/2">
                  <div className="relative h-2">
                    {/* Background track (unfilled) */}
                    <div className="absolute inset-0 h-2 rounded-full bg-emerald-700/8" />
                    {/* Filled track */}
                    <div 
                      className="absolute left-0 top-0 h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${severityThreshold * 50}%` }}
                    />
                    <input
                      type="range"
                      id="comment-intensity"
                      min="0"
                      max="2"
                      step="1"
                      value={severityThreshold}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                      onChange={(e) => { setSeverityThreshold(Number(e.target.value)); setDirty(true); }}
                    />
                    {/* Thumb */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-sm shadow-md pointer-events-none transition-all"
                      style={{ left: `calc(${severityThreshold * 50}% - 8px)` }}
                    />
                  </div>
                  {/* Labels below the bar */}
                  <div className="flex justify-between text-xs px-1">
                    <span className={severityThreshold === 0 ? "text-foreground font-medium" : "text-muted-foreground"}>LOW</span>
                    <span className={ `text-center ${severityThreshold === 1 ? "text-foreground font-medium" : "text-muted-foreground"}`}>MED <br/>(Recommended)</span>
                    <span className={severityThreshold === 2 ? "text-foreground font-medium" : "text-muted-foreground"}>HIGH</span>
                  </div>
                </div>
                </div>
               
                {/* Severity description */}
                <p className="text-sm text-foreground mt-2">
                  {severityThreshold === 0 && "All comments including minor suggestions. May be noisy on large PRs."}
                  {severityThreshold === 1 && "Balanced feedback — medium and high severity issues only."}
                  {severityThreshold === 2 && "Critical issues only — may miss less severe but still valuable suggestions."}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PR Summary Settings
                </CardTitle>
                {/* <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <InfoTooltip content="Configure what appears in your PR summary comments" side="left" />
                  <span>Summary posted as comment</span>
                </div> */}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Label htmlFor="append-pr-summary" className="cursor-pointer text-sm font-medium">
                  Pull Request summary
                  </Label>
                  <InfoTooltip content="Enable to post a summary comment on pull requests" side="right" />
                </div>
                <Checkbox
                  id="append-pr-summary"
                  checked={prSummarySettings.enabled}
                  onCheckedChange={(v: boolean) => { 
                    const isEnabled = Boolean(v);
                    setPrSummarySettings(prev => ({
                      ...prev,
                      enabled: isEnabled,
                      // Auto-enable sequenceDiagram and issueTables when enabling
                      ...(isEnabled && { sequenceDiagram: true, issueTables: true })
                    })); 
                    setDirty(true); 
                  }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <h4 className="text-sm font-medium">What should be included in your PR summary</h4>
                  <InfoTooltip content="Choose which components to include in the summary. If you disabled all components, then only summary text will be posted." side="right" />
                </div>

                <div className="space-y-3">


                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Sequence Diagram</div>
                        <div className="text-xs text-muted-foreground">Generate a sequence diagram of the changes</div>
                      </div>
                    </div>
                    <Checkbox
                      checked={prSummarySettings.sequenceDiagram}
                      disabled={!prSummarySettings.enabled}
                      onCheckedChange={(v: boolean) => { 
                        setPrSummarySettings(prev => ({ ...prev, sequenceDiagram: Boolean(v) })); 
                        setDirty(true); 
                      }}
                      className="ml-3"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Issues Table</div>
                        <div className="text-xs text-muted-foreground">Show a table of important files changed with ratings</div>
                      </div>
                    </div>
                    <Checkbox
                      checked={prSummarySettings.issueTables}
                      disabled={!prSummarySettings.enabled}
                      onCheckedChange={(v: boolean) => { 
                        setPrSummarySettings(prev => ({ ...prev, issueTables: Boolean(v) })); 
                        setDirty(true); 
                      }}
                      className="ml-3"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Impact Assessment</div>
                        <div className="text-xs text-muted-foreground">Include a confidence rating for the PR</div>
                      </div>
                    </div>
                    <Checkbox
                      checked={prSummarySettings.impactAsessment}
                      disabled={!prSummarySettings.enabled}
                      onCheckedChange={(v: boolean) => { 
                        setPrSummarySettings(prev => ({ ...prev, impactAsessment: Boolean(v) })); 
                        setDirty(true); 
                      }}
                      className="ml-3"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Vibe Check Rap</div>
                        <div className="text-xs text-muted-foreground">Get a fun rap summary of your PR</div>
                      </div>
                    </div>
                    <Checkbox
                      checked={prSummarySettings.vibeCheckRap}
                      disabled={!prSummarySettings.enabled}
                      onCheckedChange={(v: boolean) => { 
                        setPrSummarySettings(prev => ({ ...prev, vibeCheckRap: Boolean(v) })); 
                        setDirty(true); 
                      }}
                      className="ml-3"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Model Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pr-model">Model for Pull Request Analysis</Label>
                    <InfoTooltip 
                      content="Select the AI model used to analyze your pull requests. Models with larger context limits can handle bigger PRs."
                      side="right"
                    />
                  </div>
                  <Select value={prModel} onValueChange={(v) => { setPrModel(v); const found = availablePrModels.find((x) => x._id === v); if (found) setPrModelName(found.name); setDirty(true); }} onOpenChange={(open) => { if (open && availablePrModels.length === 0) { fetchAvailablePrModels(); } }}>
                    <SelectTrigger id="pr-model">
                      <SelectValue placeholder={prModelName ? `${prModelName}${(() => { const m = availablePrModels.find(x => x.name === prModelName); return m?.input_context_limit ? ` (${formatContextLimit(m.input_context_limit)} input tokens)` : ""; })()}` : "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPrModels && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                      {!loadingPrModels && availablePrModels.length === 0 && (
                        <SelectItem value="none" disabled>No models available</SelectItem>
                      )}
                      {availablePrModels.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}{m.input_context_limit && <span className="text-xs text-muted-foreground ml-2">{formatContextLimit(m.input_context_limit)} input tokens</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* <div className="space-y-3">
                  <Label htmlFor="repo-model">Model for Repo Analysis</Label>
                  <Select value={repoModel} onValueChange={(v) => { setRepoModel(v); const found = availableRepoModels.find((x) => x._id === v); if (found) setRepoModelName(found.name); setDirty(true); }} onOpenChange={(open) => { if (open && availableRepoModels.length === 0) { fetchAvailableRepoModels(); } }}>
                    <SelectTrigger id="repo-model">
                      <SelectValue placeholder={repoModelName || "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingRepoModels && (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      )}
                      {!loadingRepoModels && availableRepoModels.length === 0 && (
                        <SelectItem value="none" disabled>No models available</SelectItem>
                      )}
                      {availableRepoModels.map((m) => (
                        <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}
              </div>
            </CardContent>
          </Card>
          
            <div className="flex items-center justify-center pt-2">
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
              <p className="text-xs m-auto text-muted-foreground">
                {scope === "team"
                  ? "This applies to the current team’s repositories."
                  : "This applies to your personal repositories."}
              </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;