import { Skeleton } from '@/components/ui/skeleton';

const FeaturesLoading = () => (
  <section aria-busy="true" aria-label="Loading features">
    <span className="sr-only">Loading features, please wait...</span>
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mx-auto h-8 w-48 mb-12" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default FeaturesLoading;
