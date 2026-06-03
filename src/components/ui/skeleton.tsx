import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70 shadow-sm",
        "before:absolute before:inset-y-0 before:left-0 before:w-1/2",
        "before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-background/55 before:to-transparent",
        "dark:bg-muted/35 dark:before:via-background/25",
        className
      )}
      {...props}
    />
  );
}

function SkeletonText({
  className,
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({
        length: lines,
      }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3",
            index === lines - 1 && lines > 1
              ? "w-2/3"
              : "w-full"
          )}
        />
      ))}
    </div>
  );
}

function SkeletonCard({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  );
}

function SkeletonTable({
  columns = 6,
  rows = 6,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded border bg-card overflow-x-auto", className)}>
      <div className="min-w-full">
        <div
          className="grid border-b bg-muted/30 px-4 py-3 gap-5"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(110px, 1fr))`,
          }}
        >
          {Array.from({
            length: columns,
          }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-3 w-20"
            />
          ))}
        </div>
        {Array.from({
          length: rows,
        }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid border-b px-4 py-4 gap-5 last:border-b-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(110px, 1fr))`,
            }}
          >
            {Array.from({
              length: columns,
            }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-24" : "w-full",
                  colIndex === columns - 1 && "w-16 justify-self-end"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonForm({
  fields = 9,
  columns = 3,
  className,
}: {
  fields?: number;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded border bg-card p-6 shadow-sm",
        className
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div
        className={cn(
          "grid gap-4",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 md:grid-cols-2",
          columns === 3 && "grid-cols-1 md:grid-cols-3"
        )}
      >
        {Array.from({
          length: fields,
        }).map((_, index) => (
          <div
            key={index}
            className="space-y-2"
          >
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonPageHeader({
  actions = 1,
}: {
  actions?: number;
}) {
  return (
    <div className="border-b bg-background px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72 max-w-[70vw]" />
        </div>
        <div className="flex gap-2">
          {Array.from({
            length: actions,
          }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-10 w-24 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonTabs({
  count = 3,
}: {
  count?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded bg-muted/40 p-1">
      {Array.from({
        length: count,
      }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-8 w-24 rounded-sm"
        />
      ))}
    </div>
  );
}

function SkeletonSidebarMenu({
  items = 10,
}: {
  items?: number;
}) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({
        length: items,
      }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-md px-2 py-2"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonForm,
  SkeletonPageHeader,
  SkeletonSidebarMenu,
  SkeletonTable,
  SkeletonTabs,
  SkeletonText,
};
