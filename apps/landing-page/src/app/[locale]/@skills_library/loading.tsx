import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => (
  <div className="px-4 py-16 sm:py-24">
    <div className="mx-auto max-w-5xl">
      <Skeleton className="mx-auto mb-3 h-8 w-56" />
      <Skeleton className="mx-auto mb-10 h-5 w-80" />
      <div className="mb-6 flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  </div>
);

export default Loading;
