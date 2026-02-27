import { Skeleton } from "@/components/ui/skeleton";

export default function NewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          뉴스 분석
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          AI가 분석한 주요 뉴스 기사를 카테고리별로 확인합니다
        </p>
      </div>

      {/* Search & filter placeholder */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* News grid placeholder */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-5"
          >
            <Skeleton className="mb-3 h-4 w-5/6 rounded-md" />
            <Skeleton className="mb-2 h-3 w-full rounded-md" />
            <Skeleton className="mb-4 h-3 w-4/6 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
