import { Skeleton } from '@/components/ui/skeleton';

const CTAFooterLoading = () => (
  <section aria-busy="true" aria-label="Loading footer">
    <span className="sr-only">Loading footer, please wait...</span>
    <div className="px-4 py-16 sm:py-24 text-center">
      <Skeleton className="mx-auto h-8 w-64 mb-8" />
      <Skeleton className="mx-auto h-12 w-80 rounded-lg mb-8" />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-12 w-36 rounded-md" />
        <Skeleton className="h-12 w-36 rounded-md" />
      </div>
    </div>
  </section>
);

export default CTAFooterLoading;
