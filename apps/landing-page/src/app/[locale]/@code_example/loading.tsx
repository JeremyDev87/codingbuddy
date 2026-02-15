import { Skeleton } from '@/components/ui/skeleton';

const CodeExampleLoading = () => (
  <section aria-busy="true" aria-label="Loading code example">
    <span className="sr-only">Loading code example, please wait...</span>
    <Skeleton className="h-8 w-48 mb-4" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </section>
);

export default CodeExampleLoading;
