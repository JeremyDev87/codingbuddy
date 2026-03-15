import { Skeleton } from '@/components/ui/skeleton';

const TuiDashboardLoading = () => (
  <section aria-busy="true" aria-label="Loading TUI dashboard">
    <span className="sr-only">Loading TUI dashboard, please wait...</span>
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mx-auto mb-3 h-8 w-64" />
        <Skeleton className="mx-auto mb-10 h-5 w-96" />
        <Skeleton className="aspect-[16/9] w-full rounded-lg" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default TuiDashboardLoading;
