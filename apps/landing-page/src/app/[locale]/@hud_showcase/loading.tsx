import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => (
  <div className="px-4 py-16 sm:py-24">
    <div className="mx-auto max-w-5xl">
      <Skeleton className="mx-auto mb-3 h-8 w-64" />
      <Skeleton className="mx-auto mb-10 h-5 w-96" />
      <Skeleton className="mx-auto mb-10 h-24 max-w-3xl rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

export default Loading;
