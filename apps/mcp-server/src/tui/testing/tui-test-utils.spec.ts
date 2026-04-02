import { flushInk, waitForFrame } from './tui-test-utils';

describe('tui-test-utils', () => {
  describe('flushInk', () => {
    it('should flush the default number of macrotask cycles (3)', async () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');

      await flushInk();

      // 3 cycles by default
      const zeroDelayCalls = spy.mock.calls.filter(([, delay]) => delay === 0);
      expect(zeroDelayCalls).toHaveLength(3);

      spy.mockRestore();
    });

    it('should flush the specified number of cycles', async () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');

      await flushInk(5);

      const zeroDelayCalls = spy.mock.calls.filter(([, delay]) => delay === 0);
      expect(zeroDelayCalls).toHaveLength(5);

      spy.mockRestore();
    });

    it('should flush 1 cycle when specified', async () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');

      await flushInk(1);

      const zeroDelayCalls = spy.mock.calls.filter(([, delay]) => delay === 0);
      expect(zeroDelayCalls).toHaveLength(1);

      spy.mockRestore();
    });

    it('should resolve without error', async () => {
      await expect(flushInk()).resolves.toBeUndefined();
    });
  });

  describe('waitForFrame', () => {
    it('should resolve immediately when assertion passes on first try', async () => {
      const getFrame = () => 'RUNNING';
      const assertion = (frame: string) => {
        expect(frame).toContain('RUNNING');
      };

      await expect(waitForFrame(getFrame, assertion)).resolves.toBeUndefined();
    });

    it('should retry until assertion passes', async () => {
      let callCount = 0;
      const getFrame = () => {
        callCount++;
        return callCount >= 3 ? 'RUNNING' : 'idle';
      };
      const assertion = (frame: string) => {
        expect(frame).toContain('RUNNING');
      };

      await waitForFrame(getFrame, assertion);
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    it('should throw last error when timeout is reached', async () => {
      const getFrame = () => 'idle';
      const assertion = (frame: string) => {
        expect(frame).toContain('RUNNING');
      };

      await expect(waitForFrame(getFrame, assertion, 50)).rejects.toThrow();
    });

    it('should handle undefined frame by passing empty string', async () => {
      const getFrame = () => undefined;
      const assertion = (frame: string) => {
        expect(frame).toBe('');
      };

      await expect(waitForFrame(getFrame, assertion)).resolves.toBeUndefined();
    });

    it('should use default timeout of 500ms', async () => {
      const start = Date.now();
      const getFrame = () => 'never-match';
      const assertion = (frame: string) => {
        expect(frame).toContain('IMPOSSIBLE');
      };

      await expect(waitForFrame(getFrame, assertion)).rejects.toThrow();

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(400);
      expect(elapsed).toBeLessThan(2000);
    });
  });
});
