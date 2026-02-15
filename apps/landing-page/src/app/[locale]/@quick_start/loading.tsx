import { Skeleton } from '@/components/ui/skeleton';

const QuickStartLoading = () => (
  <section aria-busy="true" aria-label="Loading quick start guide">
    <span className="sr-only">Loading quick start guide, please wait...</span>
    <Skeleton className="h-8 w-48 mb-4" />
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  </section>
);

export default QuickStartLoading;
