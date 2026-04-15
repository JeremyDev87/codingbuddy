import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => (
  <div className="px-4 py-16 sm:py-24">
    <div className="mx-auto max-w-5xl">
      <Skeleton className="mx-auto mb-3 h-8 w-80" />
      <Skeleton className="mx-auto mb-10 h-5 w-96" />
      <div className="mb-8 flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  </div>
);

export default Loading;
