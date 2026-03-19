import type { ActivitySample } from '../dashboard-types';
export type { ActivitySample } from '../dashboard-types';

/** Format elapsed time as "Xm Ys" or "Ys". */
export function formatElapsed(startedAt: number, now: number): string {
  const totalSec = Math.floor((now - startedAt) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

/** Format relative time as "just now", "Ns ago", "Nm ago", "Nh ago". */
export function formatRelativeTime(timestamp: number, now: number): string {
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec <= 2) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

const SPINNER_FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧';

/** Return spinner braille character for a given tick (8-frame cycle). */
export function spinnerFrame(tick: number): string {
  return SPINNER_FRAMES[tick % 8];
}

/** Alternating pulse icon: ● on even ticks, ◉ on odd ticks. */
export function pulseIcon(tick: number): string {
  return tick % 2 === 0 ? '●' : '◉';
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/** Render a sparkline string from numeric samples using block characters. */
export function renderSparkline(samples: number[], width: number): string {
  if (samples.length === 0) return '';
  const visible = samples.slice(-width);
  const min = Math.min(...visible);
  const max = Math.max(...visible);
  const range = max - min;
  return visible
    .map(v => {
      if (range === 0) return SPARK_CHARS[0];
      const idx = Math.round(((v - min) / range) * 7);
      return SPARK_CHARS[idx];
    })
    .join('');
}

/** Compute tool-call throughput as "N.N/min". */
export function computeThroughput(samples: ActivitySample[]): string {
  if (samples.length <= 1) return '0.0/min';
  const first = samples[0];
  const last = samples[samples.length - 1];
  const durationMin = (last.timestamp - first.timestamp) / 60000;
  if (durationMin <= 0) return '0.0/min';
  const totalCalls = samples.reduce((sum, s) => sum + s.toolCalls, 0);
  return `${(totalCalls / durationMin).toFixed(1)}/min`;
}

/** Format a UTC timestamp as "HH:MM:SS". */
export function formatTimeWithSeconds(now: number): string {
  const d = new Date(now);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
