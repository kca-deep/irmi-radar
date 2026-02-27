import { Skeleton } from "@/components/ui/skeleton";

export default function SignalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          위기 신호
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          감지된 민생 위기 신호를 등급별로 확인합니다
        </p>
      </div>

      {/* Filter bar placeholder */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Signal cards placeholder */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="mb-2 h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
              <Skeleton className="size-6 shrink-0 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
