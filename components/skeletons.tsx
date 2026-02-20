import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="warm-card p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-32 mx-auto" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-5 w-24 mx-auto" />
          </div>
        </div>
        <div className="warm-card p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        {[1, 2, 3].map((i) => (
          <MealCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function MealCardSkeleton() {
  return (
    <div className="warm-card overflow-hidden">
      <Skeleton className="w-full h-36" />
      <div className="p-3 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="warm-card p-6 space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
      <div className="warm-card p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="warm-card p-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center space-y-2">
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="warm-card p-4 text-center space-y-2">
            <Skeleton className="h-7 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>
      <div className="warm-card p-4">
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </div>
  );
}
