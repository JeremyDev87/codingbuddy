import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => (
  <div className="border-y border-terminal-border/50 px-4 py-8">
    <div className="mx-auto flex max-w-4xl justify-center gap-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-24" />
      ))}
    </div>
  </div>
);

export default Loading;
