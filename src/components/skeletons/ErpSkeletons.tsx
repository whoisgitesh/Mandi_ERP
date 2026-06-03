import {
  Skeleton,
  SkeletonCard,
  SkeletonForm,
  SkeletonPageHeader,
  SkeletonTable,
  SkeletonTabs,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ListPageSkeleton({
  titleActions = 1,
  columns = 6,
  rows = 7,
}: {
  titleActions?: number;
  columns?: number;
  rows?: number;
}) {
  return (
    <div>
      <SkeletonPageHeader actions={titleActions} />
      <div className="p-6">
        <SkeletonTable
          columns={columns}
          rows={rows}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <SkeletonPageHeader actions={0} />
      <div className="grid gap-4 p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}

function DetailPageSkeleton({
  actions = 3,
  fields = 12,
  tableColumns = 8,
  tableRows = 4,
  tabs = false,
  totals = true,
}: {
  actions?: number;
  fields?: number;
  tableColumns?: number;
  tableRows?: number;
  tabs?: boolean;
  totals?: boolean;
}) {
  return (
    <div>
      <SkeletonPageHeader actions={actions} />
      <div className="p-6 space-y-4">
        <div className="rounded border bg-card p-6 shadow-sm">
          {tabs && (
            <div className="mb-6">
              <SkeletonTabs count={3} />
            </div>
          )}
          <SkeletonForm
            fields={fields}
            columns={3}
            className="border-0 p-0 shadow-none"
          />
        </div>
        <div className="rounded border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <Skeleton className="h-5 w-20" />
            {totals && (
              <div className="flex gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            )}
          </div>
          <SkeletonTable
            columns={tableColumns}
            rows={tableRows}
            className="border-0"
          />
        </div>
      </div>
    </div>
  );
}

function PurchaseInvoiceSkeleton() {
  return (
    <DetailPageSkeleton
      actions={3}
      fields={12}
      tableColumns={11}
      tableRows={4}
      totals
    />
  );
}

function GrnSkeleton() {
  return (
    <DetailPageSkeleton
      actions={3}
      fields={13}
      tableColumns={15}
      tableRows={3}
      tabs
      totals
    />
  );
}

function PostedPurchaseInvoiceSkeleton() {
  return (
    <DetailPageSkeleton
      actions={1}
      fields={12}
      tableColumns={9}
      tableRows={4}
      totals
    />
  );
}

function SetupFieldSkeleton({
  withHelpText = true,
}: {
  withHelpText?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-32" />
      {withHelpText && <Skeleton className="h-3 w-48 max-w-full" />}
      <Skeleton className="h-10 w-full rounded" />
    </div>
  );
}

function SetupToggleSkeleton() {
  return (
    <div className="flex items-start justify-between gap-6 rounded-md py-1">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  );
}

function SetupSectionSkeleton({
  fields = 8,
  columns = 2,
  toggles = 0,
}: {
  fields?: number;
  columns?: 1 | 2;
  toggles?: number;
}) {
  return (
    <div className="rounded border bg-card shadow-sm">
      <div className="space-y-2 border-b p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>
      <div className="p-6">
        {fields > 0 && (
          <div
            className={cn(
              "grid gap-x-8 gap-y-5",
              columns === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
            )}
          >
            {Array.from({ length: fields }).map((_, index) => (
              <SetupFieldSkeleton
                key={index}
                withHelpText={index % 2 === 0}
              />
            ))}
          </div>
        )}
        {toggles > 0 && (
          <div className={cn("space-y-4", fields > 0 && "mt-6 border-t pt-5")}>
            {Array.from({ length: toggles }).map((_, index) => (
              <SetupToggleSkeleton key={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SetupPageSkeleton({
  tabs = 4,
  numberFields = 10,
  secondarySections = 2,
}: {
  tabs?: number;
  numberFields?: number;
  secondarySections?: number;
}) {
  return (
    <div>
      <SkeletonPageHeader actions={1} />
      <div className="p-6 space-y-4">
        <SkeletonTabs count={tabs} />
        <SetupSectionSkeleton
          fields={numberFields}
          columns={2}
        />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {Array.from({ length: secondarySections }).map((_, index) => (
            <SetupSectionSkeleton
              key={index}
              fields={index === 0 ? 2 : 3}
              toggles={index === 0 ? 5 : 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

export {
  CardGridSkeleton,
  DashboardSkeleton,
  DetailPageSkeleton,
  GrnSkeleton,
  ListPageSkeleton,
  PostedPurchaseInvoiceSkeleton,
  PurchaseInvoiceSkeleton,
  SetupFieldSkeleton,
  SetupPageSkeleton,
  SetupSectionSkeleton,
};
