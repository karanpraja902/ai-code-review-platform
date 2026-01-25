"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { _config } from "@/lib/_config";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Shield,
  Palette,
  Zap,
  Code,
  Accessibility,
  CheckCircle,
  Trash2,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { getRepository } from "../../analysis/_actions/getRepository";

// Dynamic imports for heavy components
const Sheet = dynamic(() => import("@/components/ui/sheet").then(mod => ({ default: mod.Sheet })));
const SheetContent = dynamic(() => import("@/components/ui/sheet").then(mod => ({ default: mod.SheetContent })));
const SheetHeader = dynamic(() => import("@/components/ui/sheet").then(mod => ({ default: mod.SheetHeader })));
const SheetTitle = dynamic(() => import("@/components/ui/sheet").then(mod => ({ default: mod.SheetTitle })));
const SheetDescription = dynamic(() => import("@/components/ui/sheet").then(mod => ({ default: mod.SheetDescription })));

const RepoMultiSelect = dynamic(() => import("./RepoMultiSelect").then(mod => ({ default: mod.RepoMultiSelect })), {
  loading: () => <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />,
});

export type CustomContextContentProps = Record<string, never>;

interface Repository {
  _id: string;
  fullName: string;
  repositoryId?: number;
}

interface ReviewTypeConfig {
  enabled: boolean;
  description: string;
  prompt: string;
}

interface CustomRule {
  _id?: string;
  name: string;
  customPrompt: string;
  repositories: string[];
  styleReviews: ReviewTypeConfig;
  securityReviews: ReviewTypeConfig;
  performanceReviews: ReviewTypeConfig;
  codeQualityReviews: ReviewTypeConfig;
  documentationReviews: ReviewTypeConfig;
  // testingReviews: ReviewTypeConfig;
  accessibilityReviews: ReviewTypeConfig;
  bestPracticesReviews: ReviewTypeConfig;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type ReviewTypeKey = 'styleReviews' | 'securityReviews' | 'performanceReviews' | 'codeQualityReviews' | 'documentationReviews' | 'accessibilityReviews' | 'bestPracticesReviews';

// Review type definitions with descriptions (prompts come from DB)
const reviewTypes: { key: ReviewTypeKey; label: string; description: string; icon: typeof Shield; color: string; defaultEnabled: boolean }[] = [
  { key: "securityReviews", label: "Security Reviews", description: "Identify security vulnerabilities and potential exploits", icon: Shield, color: "text-red-500", defaultEnabled: true },
  { key: "performanceReviews", label: "Performance Reviews", description: "Identify performance bottlenecks and optimization opportunities", icon: Zap, color: "text-yellow-500", defaultEnabled: true },
  { key: "codeQualityReviews", label: "Code Quality Reviews", description: "Evaluate code maintainability, readability, and design patterns", icon: Code, color: "text-blue-500", defaultEnabled: true },
  { key: "bestPracticesReviews", label: "Best Practices Reviews", description: "Ensure adherence to industry best practices and standards", icon: CheckCircle, color: "text-emerald-500", defaultEnabled: false },
  { key: "styleReviews", label: "Style Reviews", description: "Check for code formatting, naming conventions, and style consistency", icon: Palette, color: "text-purple-500", defaultEnabled: false },
  { key: "documentationReviews", label: "Documentation Reviews", description: "Check for adequate comments, JSDoc, and documentation", icon: FileText, color: "text-green-500", defaultEnabled: false },
  { key: "accessibilityReviews", label: "Accessibility Reviews", description: "Check for accessibility compliance (WCAG, ARIA, etc.)", icon: Accessibility, color: "text-orange-500", defaultEnabled: false },
];

// Helper to get default review config (minimal - prompts come from DB)
const createDefaultReviewConfig = (reviewType: typeof reviewTypes[number]): ReviewTypeConfig => ({
  enabled: reviewType.defaultEnabled,
  description: reviewType.description,
  prompt: "", // Prompts come from DB defaults
});

const defaultRule: CustomRule = {
  name: "",
  customPrompt: "",
  repositories: [],
  styleReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'styleReviews')!),
  securityReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'securityReviews')!),
  performanceReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'performanceReviews')!),
  codeQualityReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'codeQualityReviews')!),
  documentationReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'documentationReviews')!),
  accessibilityReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'accessibilityReviews')!),
  bestPracticesReviews: createDefaultReviewConfig(reviewTypes.find(r => r.key === 'bestPracticesReviews')!),
  isActive: true,
  isDefault: false,
};

const CustomContextContent: React.FC<CustomContextContentProps> = () => {
  const { getToken } = useAuth();

  const [rules, setRules] = useState<CustomRule[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule>(defaultRule);
  const [saving, setSaving] = useState(false);
  const [isNewRule, setIsNewRule] = useState(false);

  const [availableRepos, setAvailableRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const debouncedSetQuery = useDebouncedCallback((val: string) => {
    setPage(1);
    setQuery(val);
  }, 400);

  const getHeaders = useCallback(async () => {
    const token = await getToken();
    const headers: Record<string, string> = {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };
    return headers;
  }, [getToken]);

  const fetchRepos = useCallback(async () => {
    try {
      setLoadingRepos(true);
      const result = await getRepository("");
      if (result?.data) {
        setAvailableRepos(result.data as Repository[]);
      }
    } catch (err) {
      console.error("Error loading repositories:", err);
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // Removed useEffect that fetched repos on mount - now lazy loaded when dropdown opens

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const url = `${_config.API_BASE_URL}/api/custom-context?page=${page}&limit=${limit}&query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers });

      if (res.ok) {
        const json = await res.json();
        setRules(json?.data || []);
        const p = json?.pagination;
        setTotalPages(p?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error loading custom rules:", err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, page, limit, query]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleRowClick = (rule: CustomRule) => {
    setEditingRule({ ...rule, repositories: rule.repositories || [] });
    setIsNewRule(false);
    setSheetOpen(true);
  };

  const handleCreateNew = () => {
    setEditingRule({ ...defaultRule });
    setIsNewRule(true);
    setSheetOpen(true);
  };

  const handleToggleStatus = async (rule: CustomRule) => {
    try {
      const headers = await getHeaders();
      const url = `${_config.API_BASE_URL}/api/custom-context/${rule._id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r._id === rule._id ? { ...r, isActive: !r.isActive } : r))
        );
        toast.success(`Rule ${!rule.isActive ? "activated" : "deactivated"}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSave = async () => {
    if (!editingRule.name.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    try {
      setSaving(true);
      const headers = await getHeaders();
      const url = isNewRule
        ? `${_config.API_BASE_URL}/api/custom-context`
        : `${_config.API_BASE_URL}/api/custom-context/${editingRule._id}`;
      const method = isNewRule ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(editingRule),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to save rule");
        return;
      }

      toast.success(isNewRule ? "Rule created successfully" : "Rule updated successfully");
      setSheetOpen(false);
      fetchRules();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save rule";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRule._id) return;

    try {
      const headers = await getHeaders();
      const url = `${_config.API_BASE_URL}/api/custom-context/${editingRule._id}`;
      const res = await fetch(url, { method: "DELETE", headers });

      if (res.ok) {
        toast.success("Rule deleted successfully");
        setSheetOpen(false);
        fetchRules();
      } else {
        toast.error("Failed to delete rule");
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleQuickDelete = async (rule: CustomRule) => {
    if (!rule._id) return;
    
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      const headers = await getHeaders();
      const url = `${_config.API_BASE_URL}/api/custom-context/${rule._id}`;
      const res = await fetch(url, { method: "DELETE", headers });

      if (res.ok) {
        toast.success("Rule deleted successfully");
        fetchRules();
      } else {
        toast.error("Failed to delete rule");
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const truncateText = (text: string, maxLen: number) => {
    if (!text) return "—";
    return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
  };

  const handleInlineSave = async () => {
    if (!editingRule.name.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    try {
      setSaving(true);
      const headers = await getHeaders();
      const url = `${_config.API_BASE_URL}/api/custom-context`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(editingRule),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to save rule");
        return;
      }

      toast.success("Rule created successfully");
      fetchRules();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save rule";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInline = (key: keyof CustomRule | ReviewTypeKey, checked: boolean) => {
    if (key === 'isActive' || key === 'isDefault') {
      setEditingRule((prev) => ({ ...prev, [key]: checked }));
    } else {
      const reviewKey = key as ReviewTypeKey;
      setEditingRule((prev) => ({
        ...prev,
        [reviewKey]: {
          ...prev[reviewKey],
          enabled: checked,
        },
      }));
    }
  };

  if (!loading && rules.length === 0 && !query) {
    return (
      <div className="h-full max-w-8xl w-full mx-auto p-5 overflow-y-auto">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b pb-4">
            <div>
              <h2 className="text-2xl font-medium">Custom Rules</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Configure how AI Code Review analyzes your code
              </p>
            </div>
          </div>

          <div className="flex py-10">
            <div className="max-w-2xl mx-auto space-y-6 w-full">
              <div className="space-y-2">
                <Label htmlFor="inline-rule-name" className="text-xs text-muted-foreground uppercase">
                  Rule Name
                </Label>
                <Input
                  id="inline-rule-name"
                  placeholder="e.g., Security Audit, Performance Check"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inline-custom-prompt" className="text-xs text-muted-foreground uppercase">
                    Custom Rules
                  </Label>
                  {editingRule.customPrompt.trim().length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          setOptimizing(true);
                          const headers = await getHeaders();
                          const res = await fetch(`${_config.API_BASE_URL}/api/custom-context/optimize`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify({ prompt: editingRule.customPrompt }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            if (data?.data?.optimizedPrompt) {
                              setEditingRule((prev) => ({ ...prev, customPrompt: data.data.optimizedPrompt }));
                              toast.success("Rules optimized!");
                            }
                          } else {
                            toast.error("Failed to optimize rules");
                          }
                        } catch {
                          toast.error("Failed to optimize rules");
                        } finally {
                          setOptimizing(false);
                        }
                      }}
                      disabled={optimizing}
                      className="text-xs gap-1 h-7"
                    >
                      <Sparkles className="h-3 w-3" />
                      {optimizing ? "Optimizing..." : "Optimize"}
                    </Button>
                  )}
                </div>
                <Textarea
                  id="inline-custom-prompt"
                  placeholder={`# Rule 1: Check for hardcoded secrets
Flag any hardcoded API keys, passwords, or tokens in the code.

# Rule 2: Enforce error handling
Ensure all async functions have proper try-catch blocks.

# Rule 3: Your custom instruction here...`}
                  className="min-h-[160px] resize-y bg-muted/50 font-mono text-sm"
                  value={editingRule.customPrompt}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, customPrompt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">
                  Repository
                </Label>
                <RepoMultiSelect
                  availableRepos={availableRepos}
                  selectedRepos={editingRule.repositories}
                  onSelectionChange={(repos) => setEditingRule((prev) => ({ ...prev, repositories: repos }))}
                  loading={loadingRepos}
                  onOpen={fetchRepos}
                />
                <p className="text-xs text-muted-foreground">
                  Select repositories where this rule applies. Leave empty to apply to all.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase">Review Types</Label>
                <div className="space-y-2">
                  {reviewTypes.map((review) => (
                    <div
                      key={review.key}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <review.icon className={`h-4 w-4 ${review.color}`} />
                        <div>
                          <span className="text-sm font-medium">{review.label}</span>
                          <p className="text-xs text-muted-foreground">{editingRule[review.key]?.description || review.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={editingRule[review.key]?.enabled ?? false}
                        onCheckedChange={(checked) => handleToggleInline(review.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase">Settings</Label>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="inline-is-active"
                      checked={editingRule.isActive}
                      onCheckedChange={(checked) => handleToggleInline("isActive", checked)}
                    />
                    <Label htmlFor="inline-is-active" className="text-sm cursor-pointer">Active</Label>
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <Switch
                      id="inline-is-default"
                      checked={editingRule.isDefault}
                      onCheckedChange={(checked) => handleToggleInline("isDefault", checked)}
                    />
                    <Label htmlFor="inline-is-default" className="text-sm cursor-pointer">Set as Default</Label>
                  </div> */}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button onClick={handleInlineSave} disabled={saving} size="lg">
                  {saving ? "Creating..." : "Create Rule"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full max-w-8xl w-full mx-auto p-5">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b pb-4">
          <div>
            <h2 className="text-2xl font-medium">Custom Rules</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Configure how AI Code Review analyzes your code
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between my-4">
            <div className="flex items-center gap-2 max-w-sm w-full border shadow-xs rounded-md pl-3">
              <Search className="size-5" />
              <Input
                placeholder="Search rules..."
                className="border-none shadow-none"
                onChange={(e) => debouncedSetQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 px-3 py-2 text-xs text-muted-foreground">
            <div className="col-span-3">Name</div>
            <div className="col-span-4">Custom Rules</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1"></div>
          </div>
          <Separator />

          <div className="h-[calc(100%-10rem)] overflow-y-auto">
            {loading ? (
              <div className="min-h-[50vh] grid place-items-center text-sm text-neutral-500">
                Loading...
              </div>
            ) : rules.length > 0 ? (
              <ul>
                {rules.map((rule, idx) => (
                  <React.Fragment key={rule._id || idx}>
                    <li
                      className="group py-4 px-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(rule)}
                    >
                      <div className="grid grid-cols-12 items-center">
                        <div className="col-span-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{rule.name || "Untitled"}</span>
                        </div>
                        <div className="col-span-4 text-sm text-muted-foreground truncate">
                          {truncateText(rule.customPrompt, 40)}
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          {rule.createdAt
                            ? formatDistanceToNow(new Date(rule.createdAt), { addSuffix: true })
                            : "—"}
                        </div>
                        <div className="col-span-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggleStatus(rule)}
                          />
                          <span className={`ml-2 text-xs ${rule.isActive ? "text-green-500" : "text-muted-foreground"}`}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={() => handleQuickDelete(rule)}
                            title="Delete rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                    <Separator />
                  </React.Fragment>
                ))}
              </ul>
            ) : (
              <div className="min-h-[50vh] grid place-items-center text-base font-medium text-foreground">
                No rules found
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-2 px-3 text-xs border-t mt-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Items per page:</span>
              <select
                aria-label="Items per page"
                className="h-7 rounded-md bg-background border px-2"
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                className="h-7 w-7 grid place-items-center rounded-md border disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-muted-foreground">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                aria-label="Next page"
                className="h-7 w-7 grid place-items-center rounded-md border disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
                disabled={page >= (totalPages || 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <RuleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        rule={editingRule}
        setRule={setEditingRule}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
        isNew={isNewRule}
        availableRepos={availableRepos}
        loadingRepos={loadingRepos}
        onFetchRepos={fetchRepos}
        getHeaders={getHeaders}
        optimizing={optimizing}
        setOptimizing={setOptimizing}
      />
    </div>
  );
};

interface RuleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: CustomRule;
  setRule: React.Dispatch<React.SetStateAction<CustomRule>>;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  isNew: boolean;
  availableRepos: Repository[];
  loadingRepos: boolean;
  onFetchRepos: () => void;
  getHeaders: () => Promise<Record<string, string>>;
  optimizing: boolean;
  setOptimizing: React.Dispatch<React.SetStateAction<boolean>>;
}

const RuleSheet: React.FC<RuleSheetProps> = ({
  open,
  onOpenChange,
  rule,
  setRule,
  onSave,
  onDelete,
  saving,
  isNew,
  availableRepos,
  loadingRepos,
  onFetchRepos,
  getHeaders,
  optimizing,
  setOptimizing,
}) => {
  const handleToggle = (key: keyof CustomRule | ReviewTypeKey, checked: boolean) => {
    if (key === 'isActive' || key === 'isDefault') {
      setRule((prev) => ({ ...prev, [key]: checked }));
    } else {
      const reviewKey = key as ReviewTypeKey;
      setRule((prev) => ({
        ...prev,
        [reviewKey]: {
          ...prev[reviewKey],
          enabled: checked,
        },
      }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="py-5 px-5 w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-0 py-0 pb-4">
          {/* <div className="flex items-center justify-between">
            
            <div className="flex items-center gap-2">
              <span className={`text-xs rounded ${rule.isActive ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
                {rule.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          </div> */}
          <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <SheetTitle className="text-left">{isNew ? "Create Rule" : "Edit Rule"}</SheetTitle>
           </div>
          <SheetDescription className="text-left">
            {isNew ? "Add a new custom rule" : "Modify this custom rule"}
          </SheetDescription>
         
        
        </SheetHeader>

        <div className="space-y-6 pb-20">
          <div className="space-y-2">
            <Label htmlFor="rule-name" className="text-xs text-muted-foreground uppercase">
              Rule Name
            </Label>
            <Input
              id="rule-name"
              placeholder="e.g., Security Audit, Performance Check"
              value={rule.name}
              onChange={(e) => setRule((prev) => ({ ...prev, name: e.target.value }))}
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="custom-prompt" className="text-xs text-muted-foreground uppercase">
                Custom Rules
              </Label>
              {rule.customPrompt.trim().length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      setOptimizing(true);
                      const headers = await getHeaders();
                      const res = await fetch(`${_config.API_BASE_URL}/api/custom-context/optimize`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ prompt: rule.customPrompt }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data?.data?.optimizedPrompt) {
                          setRule((prev) => ({ ...prev, customPrompt: data.data.optimizedPrompt }));
                          toast.success("Rules optimized!");
                        }
                      } else {
                        toast.error("Failed to optimize rules");
                      }
                    } catch {
                      toast.error("Failed to optimize rules");
                    } finally {
                      setOptimizing(false);
                    }
                  }}
                  disabled={optimizing}
                  className="text-xs gap-1 h-7"
                >
                  <Sparkles className="h-3 w-3" />
                  {optimizing ? "Optimizing..." : "Optimize"}
                </Button>
              )}
            </div>
            <Textarea
              id="custom-prompt"
              placeholder={`# Rule 1: Check for hardcoded secrets
Flag any hardcoded API keys, passwords, or tokens in the code.

# Rule 2: Enforce error handling
Ensure all async functions have proper try-catch blocks.

# Rule 3: Your custom instruction here...`}
              className="min-h-[160px] resize-y bg-muted/50 font-mono text-sm"
              value={rule.customPrompt}
              onChange={(e) => setRule((prev) => ({ ...prev, customPrompt: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase">
              Repository
            </Label>
            <RepoMultiSelect
              availableRepos={availableRepos}
              selectedRepos={rule.repositories || []}
              onSelectionChange={(repos) => setRule((prev) => ({ ...prev, repositories: repos }))}
              loading={loadingRepos}
              onOpen={onFetchRepos}
            />
            <p className="text-xs text-muted-foreground">
              {(rule.repositories?.length || 0) === 0 ? "Applies to all repositories" : `${rule.repositories?.length} repositories selected`}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase">Review Types</Label>
            <div className="space-y-2">
              {reviewTypes.map((review) => (
                <div
                  key={review.key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <review.icon className={`h-4 w-4 ${review.color}`} />
                    <div>
                      <span className="text-sm font-medium">{review.label}</span>
                      <p className="text-xs text-muted-foreground">{rule[review.key]?.description || review.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={rule[review.key]?.enabled ?? false}
                    onCheckedChange={(checked) => handleToggle(review.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase">Settings</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <span className="text-sm">Active</span>
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(checked) => handleToggle("isActive", checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <span className="text-sm">Set as Default</span>
                <Switch
                  checked={rule.isDefault}
                  onCheckedChange={(checked) => handleToggle("isDefault", checked)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : isNew ? "Create Rule" : "Save Changes"}
            </Button>
            {!isNew && (
              <Button variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CustomContextContent;
