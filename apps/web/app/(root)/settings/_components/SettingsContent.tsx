"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { _config } from "@/lib/_config";
import { toast } from "sonner";
import type { SettingsData } from "../_actions/getSettingsData";

interface SettingsContentProps {
  initialData: SettingsData;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ initialData }) => {
  const { getToken } = useAuth();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repoModel, setRepoModel] = useState<string>("");
  const [prModel, setPrModel] = useState<string>("");
  const [repoModelName, setRepoModelName] = useState<string>("");
  const [prModelName, setPrModelName] = useState<string>("");
  // const [availableRepoModels, setAvailableRepoModels] = useState<Array<{ _id: string; name: string; provider: string; input_context_limit?: number }>>(initialData.availableRepoModels);
  const [availablePrModels, setAvailablePrModels] = useState<Array<{ _id: string; name: string; provider: string; input_context_limit?: number }>>(initialData.availablePrModels);

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
    // Initialize from server-provided data
    const s = initialData.settings as any;
    
    // Extract model IDs and names from settings
    const repoModelId = typeof s.defaultModelRepo === "string" ? s.defaultModelRepo : "";
    const prModelId = typeof s.defaultModelPr === "string" ? s.defaultModelPr : "";
    const repoModelNameVal = typeof s.defaultModelRepoName === "string" ? s.defaultModelRepoName : "";
    const prModelNameVal = typeof s.defaultModelPrName === "string" ? s.defaultModelPrName : "";
    
    // Extract commentSeverity (default to 1 = MED)
    const savedSeverity = typeof s.commentSeverity === "number" ? s.commentSeverity : 1;
    
    // Extract prSummarySettings (default to all enabled)
    const savedPrSummarySettings = s.prSummarySettings || {};
    
    setRepoModel(repoModelId);
    setPrModel(prModelId);
    setRepoModelName(repoModelNameVal);
    setPrModelName(prModelNameVal);
    setSeverityThreshold(savedSeverity);
    setPrSummarySettings({
      enabled: savedPrSummarySettings.enabled ?? true,
      sequenceDiagram: savedPrSummarySettings.sequenceDiagram ?? true,
      issueTables: savedPrSummarySettings.issueTables ?? true,
      impactAsessment: savedPrSummarySettings.impactAsessment ?? true,
      vibeCheckRap: savedPrSummarySettings.vibeCheckRap ?? true,
    });
  }, [initialData]);

  const fetchAvailablePrModels = async () => {
    try {
      setLoadingPrModels(true);
      const token = await getToken();
      const headers: Record<string, string> = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
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
      const payload = {
        ...(repoModel ? { defaultModelRepoId: repoModel } : {}),
        ...(prModel ? { defaultModelPrId: prModel } : {}),
        commentSeverity: severityThreshold,
        prSummarySettings,
      };
      const settingsRes = await fetch(`${_config.API_BASE_URL}/api/team/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!settingsRes.ok) {
        const err = await settingsRes.json().catch(() => ({}));
        toast.error(err.message || "Failed to save settings");
        return;
      }
      toast.success("Settings updated");
      setDirty(false);
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
              </div>
            </CardContent>
          </Card>
          
            <div className="flex items-center justify-center pt-2">
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
              <p className="text-xs m-auto text-muted-foreground">
                These settings apply to your team&apos;s repositories.
              </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;