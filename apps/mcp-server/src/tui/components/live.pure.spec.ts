import { describe, it, expect } from 'vitest';
import {
  formatElapsed,
  formatRelativeTime,
  spinnerFrame,
  pulseIcon,
  renderSparkline,
  computeThroughput,
  formatTimeWithSeconds,
} from './live.pure';
import type { ActivitySample } from './live.pure';

describe('tui/components/live.pure', () => {
  describe('formatElapsed', () => {
    it('0초 경과 → "0s"', () => {
      const now = 1000000;
      expect(formatElapsed(now, now)).toBe('0s');
    });

    it('초 단위만 → "45s"', () => {
      const start = 1000000;
      const now = start + 45_000;
      expect(formatElapsed(start, now)).toBe('45s');
    });

    it('분+초 → "1m 23s"', () => {
      const start = 1000000;
      const now = start + 83_000; // 1분 23초
      expect(formatElapsed(start, now)).toBe('1m 23s');
    });

    it('정확히 1분 → "1m 0s"', () => {
      const start = 1000000;
      const now = start + 60_000;
      expect(formatElapsed(start, now)).toBe('1m 0s');
    });

    it('10분 이상 → "12m 5s"', () => {
      const start = 1000000;
      const now = start + 725_000; // 12분 5초
      expect(formatElapsed(start, now)).toBe('12m 5s');
    });

    it('startedAt > now (clock drift) → "0s"로 클램프', () => {
      const now = 1000000;
      expect(formatElapsed(now + 5000, now)).toBe('0s');
    });
  });

  describe('formatRelativeTime', () => {
    it('0~2초 차이 → "just now"', () => {
      const now = 1000000;
      expect(formatRelativeTime(now, now)).toBe('just now');
      expect(formatRelativeTime(now - 1000, now)).toBe('just now');
      expect(formatRelativeTime(now - 2000, now)).toBe('just now');
    });

    it('3~59초 → "Ns ago"', () => {
      const now = 1000000;
      expect(formatRelativeTime(now - 3000, now)).toBe('3s ago');
      expect(formatRelativeTime(now - 45000, now)).toBe('45s ago');
      expect(formatRelativeTime(now - 59000, now)).toBe('59s ago');
    });

    it('60초 이상 → "Nm ago"', () => {
      const now = 1000000;
      expect(formatRelativeTime(now - 60000, now)).toBe('1m ago');
      expect(formatRelativeTime(now - 150000, now)).toBe('2m ago');
    });

    it('3600초 이상 → "Nh ago"', () => {
      const now = 10000000;
      expect(formatRelativeTime(now - 3600000, now)).toBe('1h ago');
      expect(formatRelativeTime(now - 7200000, now)).toBe('2h ago');
    });

    it('timestamp > now (clock drift) → "just now"로 클램프', () => {
      const now = 1000000;
      expect(formatRelativeTime(now + 5000, now)).toBe('just now');
    });
  });

  describe('spinnerFrame', () => {
    const FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧';

    it('tick 0 → 첫 번째 프레임 "⠋"', () => {
      expect(spinnerFrame(0)).toBe('⠋');
    });

    it('tick 7 → 마지막 프레임 "⠧"', () => {
      expect(spinnerFrame(7)).toBe('⠧');
    });

    it('tick 8 → 다시 첫 프레임 (순환)', () => {
      expect(spinnerFrame(8)).toBe('⠋');
    });

    it('모든 8프레임이 올바른 순서', () => {
      const frames = Array.from({ length: 8 }, (_, i) => spinnerFrame(i)).join('');
      expect(frames).toBe(FRAMES);
    });
  });

  describe('pulseIcon', () => {
    it('짝수 tick → "●"', () => {
      expect(pulseIcon(0)).toBe('●');
      expect(pulseIcon(2)).toBe('●');
      expect(pulseIcon(100)).toBe('●');
    });

    it('홀수 tick → "◉"', () => {
      expect(pulseIcon(1)).toBe('◉');
      expect(pulseIcon(3)).toBe('◉');
      expect(pulseIcon(99)).toBe('◉');
    });
  });

  describe('renderSparkline', () => {
    it('빈 배열 → 빈 문자열', () => {
      expect(renderSparkline([], 10)).toBe('');
    });

    it('모두 같은 값 → 최하위 블록 반복', () => {
      expect(renderSparkline([5, 5, 5], 3)).toBe('▁▁▁');
    });

    it('오름차순 → 점진적 상승', () => {
      const result = renderSparkline([0, 1, 2, 3, 4, 5, 6, 7], 8);
      expect(result).toBe('▁▂▃▄▅▆▇█');
    });

    it('width보다 샘플 많으면 뒤에서 width개만 사용', () => {
      const samples = [0, 0, 0, 0, 0, 7]; // 6개 중 마지막 3개만
      const result = renderSparkline(samples, 3);
      expect(result).toHaveLength(3);
    });

    it('width보다 샘플 적으면 샘플 수만큼 출력', () => {
      const result = renderSparkline([1, 2], 10);
      expect(result).toHaveLength(2);
    });

    it('단일 값 → 단일 ▁', () => {
      expect(renderSparkline([42], 5)).toBe('▁');
    });

    it('min=max일 때 모두 ▁', () => {
      expect(renderSparkline([10, 10, 10, 10], 4)).toBe('▁▁▁▁');
    });
  });

  describe('computeThroughput', () => {
    it('빈 배열 → "0.0/min"', () => {
      expect(computeThroughput([])).toBe('0.0/min');
    });

    it('단일 샘플 → "0.0/min"', () => {
      const samples: ActivitySample[] = [{ timestamp: 1000, toolCalls: 5 }];
      expect(computeThroughput(samples)).toBe('0.0/min');
    });

    it('1분 동안 5회 호출 → "5.0/min"', () => {
      const samples: ActivitySample[] = [
        { timestamp: 0, toolCalls: 0 },
        { timestamp: 60000, toolCalls: 5 },
      ];
      expect(computeThroughput(samples)).toBe('5.0/min');
    });

    it('30초 동안 3회 호출 → "6.0/min"', () => {
      const samples: ActivitySample[] = [
        { timestamp: 0, toolCalls: 0 },
        { timestamp: 30000, toolCalls: 3 },
      ];
      expect(computeThroughput(samples)).toBe('6.0/min');
    });

    it('여러 샘플의 총합으로 계산', () => {
      const samples: ActivitySample[] = [
        { timestamp: 0, toolCalls: 1 },
        { timestamp: 30000, toolCalls: 2 },
        { timestamp: 60000, toolCalls: 3 },
      ];
      // 총 toolCalls = 1+2+3 = 6, 기간 = 60초 = 1분 → 6.0/min
      expect(computeThroughput(samples)).toBe('6.0/min');
    });
  });

  describe('formatTimeWithSeconds', () => {
    it('로컬 시간 기준으로 HH:MM:SS 형식 반환', () => {
      const d = new Date(2026, 0, 1, 14, 23, 45); // local 14:23:45
      expect(formatTimeWithSeconds(d.getTime())).toBe('14:23:45');
    });

    it('한 자리 시/분/초 → 0으로 패딩', () => {
      const d = new Date(2026, 0, 1, 3, 5, 9); // local 03:05:09
      expect(formatTimeWithSeconds(d.getTime())).toBe('03:05:09');
    });

    it('자정 → "00:00:00"', () => {
      const d = new Date(2026, 0, 1, 0, 0, 0); // local midnight
      expect(formatTimeWithSeconds(d.getTime())).toBe('00:00:00');
    });
  });
});
