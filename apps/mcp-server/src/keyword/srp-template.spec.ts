import { renderSrpTemplate } from './srp-template';

describe('srp-template', () => {
  describe('renderSrpTemplate', () => {
    it('should replace complexity placeholder', () => {
      const result = renderSrpTemplate({
        complexity: 'COMPLEX',
        reason: 'Test reason',
      });

      expect(result).toContain('**COMPLEX**');
      expect(result).not.toContain('{{COMPLEXITY}}');
    });

    it('should replace reason placeholder', () => {
      const result = renderSrpTemplate({
        complexity: 'COMPLEX',
        reason: 'Task requires structured reasoning',
      });

      expect(result).toContain('Task requires structured reasoning');
      expect(result).not.toContain('{{REASON}}');
    });

    it('should work with SIMPLE complexity', () => {
      const result = renderSrpTemplate({
        complexity: 'SIMPLE',
        reason: 'Forced via --srp',
      });

      expect(result).toContain('**SIMPLE**');
      expect(result).toContain('Forced via --srp');
    });

    it('should preserve all SRP steps in output', () => {
      const result = renderSrpTemplate({
        complexity: 'COMPLEX',
        reason: 'Test',
      });

      expect(result).toContain('### 1. DECOMPOSE');
      expect(result).toContain('### 2. SOLVE');
      expect(result).toContain('### 3. VERIFY');
      expect(result).toContain('### 4. SYNTHESIZE');
      expect(result).toContain('### 5. REFLECT');
    });
  });
});
