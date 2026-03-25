'use client';

import type { Session } from '@/lib/types';

interface SessionTimelineProps {
  sessions: Session[];
}

function formatDuration(startedAt: number, endedAt: number | null): string {
  if (!endedAt) return 'In progress';
  const seconds = Math.round(endedAt - startedAt);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function outcomeColor(outcome: string | null): string {
  switch (outcome) {
    case 'success':
      return 'bg-[var(--color-success)]';
    case 'error':
      return 'bg-[var(--color-error)]';
    case 'partial':
      return 'bg-[var(--color-warning)]';
    default:
      return 'bg-[var(--color-text-muted)]';
  }
}

export function SessionTimeline({ sessions }: SessionTimelineProps) {
  const displayed = sessions.slice(0, 20);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-lg font-semibold">Session Timeline</h2>
      <div className="space-y-3">
        {displayed.map((session) => (
          <div
            key={session.sessionId}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <div
              className={`h-2 w-2 rounded-full ${outcomeColor(session.outcome)}`}
              title={session.outcome ?? 'unknown'}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {session.project ?? 'Unknown project'}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {session.model?.split('-').slice(0, 2).join('-') ?? ''}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span>{formatTime(session.startedAt)}</span>
                <span>{formatDuration(session.startedAt, session.endedAt)}</span>
                <span>{session.toolCallCount} calls</span>
                {session.errorCount > 0 && (
                  <span className="text-[var(--color-error)]">
                    {session.errorCount} errors
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {sessions.length > 20 && (
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
          Showing 20 of {sessions.length} sessions
        </p>
      )}
    </div>
  );
}
