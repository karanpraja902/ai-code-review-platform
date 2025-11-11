"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ArrowLeft, Save, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getRepoSettings } from "../_actions/getRepoSettings";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { updateRepoSettings } from "../_actions/updateSetting";
import { toast } from "sonner";

const SettingsFormSchema = z
  .object({
    analysisType: z.enum([
      "security",
      "quality",
      "performance",
      "style",
      "custom",
    ]),
    analysisFrequency: z.enum([
      "on_push",
      "daily",
      "weekly",
      "monthly",
      "custom",
    ]),
    analysisIntervalDays: z
      .string()
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Analysis interval days must be a positive number",
      })
      .optional(),
    analysisIsRequired: z.boolean(),
    raiseIssues: z.boolean(),
    autoFixBugs: z.boolean(),
    trackGitHubIssues: z.boolean(),
    trackGitHubPullRequests: z.boolean(),
  })
  .refine((data) => {
    if (data.analysisFrequency === "custom" && !data.analysisIntervalDays) {
      return false;
    }
    return true;
  });

const SettingsForm = () => {
  const [saving, setSaving] = useState(false);

  const { repoId } = useParams<{ repoId: string }>();
  const router = useRouter();

  const queryClient = useQueryClient();

  const {
    data: { data: settings },
  } = useSuspenseQuery({
    queryKey: ["repoSettings", repoId],
    queryFn: () => getRepoSettings(repoId),
  });

  const form = useForm<z.infer<typeof SettingsFormSchema>>({
    resolver: zodResolver(SettingsFormSchema),
    defaultValues: {
      analysisType: settings.analysisType,
      analysisFrequency: settings.analysisFrequency,
      analysisIntervalDays: settings.analysisIntervalDays
        ? String(settings.analysisIntervalDays)
        : "",
      analysisIsRequired: settings.analysisRequired,
      raiseIssues: settings.raiseIssues,
      autoFixBugs: settings.autoFixBugs,
      trackGitHubIssues: settings.trackGithubIssues,
      trackGitHubPullRequests: settings.trackGithubPullRequests,
    },
  });

  const watchAnalysisFrequency = form.watch("analysisFrequency");

  useEffect(() => {
    if (watchAnalysisFrequency === "custom") {
      form.setValue("analysisIntervalDays", undefined);
    }
  }, [watchAnalysisFrequency]);

  const onSubmit = async (data: z.infer<typeof SettingsFormSchema>) => {
    setSaving(true);
    try {
      await updateRepoSettings(repoId, {
        analysisType: data.analysisType,
        analysisFrequency: data.analysisFrequency,
        analysisIntervalDays: data.analysisIntervalDays
          ? Number(data.analysisIntervalDays)
          : undefined,
        analysisRequired: data.analysisIsRequired,
        raiseIssues: data.raiseIssues,
        autoFixBugs: data.autoFixBugs,
        trackGithubIssues: data.trackGitHubIssues,
        trackGithubPullRequests: data.trackGitHubPullRequests,
      });

      toast.success("Repository settings saved successfully");

      queryClient.invalidateQueries({ queryKey: ["repoSettings", repoId] });

      // Navigate back to analysis page
      const backUrl = `/analysis`;
      router.push(backUrl);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save repository settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/analysis`}>
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to Analysis</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold md:text-3xl">Repository Settings</h1>
          <p className="text-sm text-gray-600 md:text-base">
            {settings.fullName}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Analysis Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Configuration</CardTitle>
              <CardDescription>
                Configure how and when analysis should be performed on this
                repository.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="analysisType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Analysis Type</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select analysis type" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="quality">Quality</SelectItem>
                          <SelectItem value="performance">
                            Performance
                          </SelectItem>
                          <SelectItem value="style">Style</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="analysisFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Analysis Frequency</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select analysis frequency" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="on_push">On Push</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchAnalysisFrequency === "custom" && (
                <FormField
                  control={form.control}
                  name="analysisIntervalDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Analysis Interval (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="analysisIsRequired"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Analysis Required Before Merge</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>
                Configure automated actions that can be performed based on
                analysis results.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="raiseIssues"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Automatically Create GitHub Issues</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoFixBugs"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>
                        Attempt Automatic Bug Fixes via Pull Requests
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tracking Settings */}
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Configure which GitHub activities to track and monitor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="trackGitHubIssues"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Track GitHub Issues</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trackGitHubPullRequests"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Track GitHub Pull Requests</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {form.formState.errors &&
            form.formState.errors.analysisIntervalDays && (
              <span>{form.formState.errors.analysisIntervalDays.message}</span>
            )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default SettingsForm;
