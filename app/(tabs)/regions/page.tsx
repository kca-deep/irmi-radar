import { Skeleton } from "@/components/ui/skeleton";

export default function RegionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          지역별 현황
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          주요 지역의 민생 리스크 수준을 비교합니다
        </p>
      </div>

      {/* Region list placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
