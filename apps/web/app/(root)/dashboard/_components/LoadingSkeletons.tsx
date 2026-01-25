import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function MetricCardSkeleton() {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-3 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent>
        <div className="mb-4 -mt-2">
          <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="h-[200px] bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function DashboardMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-3 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
