import {
  VerbosityLevel,
  VERBOSITY_PRESETS,
  getVerbosityConfig,
  isUnlimited,
} from './verbosity.types';

describe('Verbosity Types', () => {
  describe('VERBOSITY_PRESETS', () => {
    it('should have all three verbosity levels defined', () => {
      expect(VERBOSITY_PRESETS).toHaveProperty('minimal');
      expect(VERBOSITY_PRESETS).toHaveProperty('standard');
      expect(VERBOSITY_PRESETS).toHaveProperty('full');
    });

    describe('minimal preset', () => {
      const config = VERBOSITY_PRESETS.minimal;

      it('should have correct level identifier', () => {
        expect(config.level).toBe('minimal');
      });

      it('should exclude rules content', () => {
        expect(config.includeRulesContent).toBe(false);
      });

      it('should exclude skill content', () => {
        expect(config.includeSkillContent).toBe(false);
      });

      it('should exclude agent prompt', () => {
        expect(config.includeAgentPrompt).toBe(false);
      });

      it('should limit expertise items to 3', () => {
        expect(config.maxExpertiseItems).toBe(3);
      });

      it('should limit context sections to 1', () => {
        expect(config.maxContextSections).toBe(1);
      });
    });

    describe('standard preset', () => {
      const config = VERBOSITY_PRESETS.standard;

      it('should have correct level identifier', () => {
        expect(config.level).toBe('standard');
      });

      it('should include rules content', () => {
        expect(config.includeRulesContent).toBe(true);
      });

      it('should include skill content', () => {
        expect(config.includeSkillContent).toBe(true);
      });

      it('should exclude agent prompt', () => {
        expect(config.includeAgentPrompt).toBe(false);
      });

      it('should limit expertise items to 5', () => {
        expect(config.maxExpertiseItems).toBe(5);
      });

      it('should limit context sections to 2', () => {
        expect(config.maxContextSections).toBe(2);
      });
    });

    describe('full preset', () => {
      const config = VERBOSITY_PRESETS.full;

      it('should have correct level identifier', () => {
        expect(config.level).toBe('full');
      });

      it('should include rules content', () => {
        expect(config.includeRulesContent).toBe(true);
      });

      it('should include skill content', () => {
        expect(config.includeSkillContent).toBe(true);
      });

      it('should include agent prompt', () => {
        expect(config.includeAgentPrompt).toBe(true);
      });

      it('should have unlimited expertise items', () => {
        expect(config.maxExpertiseItems).toBe(-1);
      });

      it('should have unlimited context sections', () => {
        expect(config.maxContextSections).toBe(-1);
      });
    });

    it('should have increasing verbosity from minimal to full', () => {
      const minimal = VERBOSITY_PRESETS.minimal;
      const standard = VERBOSITY_PRESETS.standard;
      const full = VERBOSITY_PRESETS.full;

      // Check expertise items progression (minimal < standard, full is unlimited)
      expect(minimal.maxExpertiseItems).toBeLessThan(
        standard.maxExpertiseItems,
      );
      expect(isUnlimited(full.maxExpertiseItems)).toBe(true);

      // Check context sections progression (minimal < standard, full is unlimited)
      expect(minimal.maxContextSections).toBeLessThan(
        standard.maxContextSections,
      );
      expect(isUnlimited(full.maxContextSections)).toBe(true);

      // Check content inclusion flags
      expect(minimal.includeRulesContent).toBe(false);
      expect(standard.includeRulesContent).toBe(true);
      expect(full.includeRulesContent).toBe(true);

      expect(minimal.includeAgentPrompt).toBe(false);
      expect(standard.includeAgentPrompt).toBe(false);
      expect(full.includeAgentPrompt).toBe(true);
    });
  });

  describe('getVerbosityConfig', () => {
    it('should return minimal config when requested', () => {
      const config = getVerbosityConfig('minimal');
      expect(config).toEqual(VERBOSITY_PRESETS.minimal);
      expect(config.level).toBe('minimal');
    });

    it('should return standard config when requested', () => {
      const config = getVerbosityConfig('standard');
      expect(config).toEqual(VERBOSITY_PRESETS.standard);
      expect(config.level).toBe('standard');
    });

    it('should return full config when requested', () => {
      const config = getVerbosityConfig('full');
      expect(config).toEqual(VERBOSITY_PRESETS.full);
      expect(config.level).toBe('full');
    });

    it('should return standard config by default', () => {
      const config = getVerbosityConfig();
      expect(config).toEqual(VERBOSITY_PRESETS.standard);
      expect(config.level).toBe('standard');
    });

    it('should return a complete VerbosityConfig object', () => {
      const config = getVerbosityConfig('minimal');

      expect(config).toHaveProperty('level');
      expect(config).toHaveProperty('includeRulesContent');
      expect(config).toHaveProperty('includeSkillContent');
      expect(config).toHaveProperty('includeAgentPrompt');
      expect(config).toHaveProperty('maxExpertiseItems');
      expect(config).toHaveProperty('maxContextSections');
    });

    it('should return immutable preset references', () => {
      const config1 = getVerbosityConfig('minimal');
      const config2 = getVerbosityConfig('minimal');

      expect(config1).toBe(config2);
      expect(config1).toBe(VERBOSITY_PRESETS.minimal);
    });
  });

  describe('isUnlimited', () => {
    it('should return true for -1', () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it('should return false for 0', () => {
      expect(isUnlimited(0)).toBe(false);
    });

    it('should return false for positive numbers', () => {
      expect(isUnlimited(1)).toBe(false);
      expect(isUnlimited(5)).toBe(false);
      expect(isUnlimited(10)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });

    it('should return false for negative numbers other than -1', () => {
      expect(isUnlimited(-2)).toBe(false);
      expect(isUnlimited(-5)).toBe(false);
      expect(isUnlimited(-10)).toBe(false);
    });

    it('should work with preset values', () => {
      const minimalConfig = VERBOSITY_PRESETS.minimal;
      expect(isUnlimited(minimalConfig.maxExpertiseItems)).toBe(false);
      expect(isUnlimited(minimalConfig.maxContextSections)).toBe(false);

      const fullConfig = VERBOSITY_PRESETS.full;
      expect(isUnlimited(fullConfig.maxExpertiseItems)).toBe(true);
      expect(isUnlimited(fullConfig.maxContextSections)).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should enforce VerbosityLevel type', () => {
      const levels: VerbosityLevel[] = ['minimal', 'standard', 'full'];

      levels.forEach(level => {
        const config = getVerbosityConfig(level);
        expect(config).toBeDefined();
        expect(config.level).toBe(level);
      });
    });

    it('should ensure all presets match VerbosityConfig interface', () => {
      const presets = Object.values(VERBOSITY_PRESETS);

      presets.forEach(preset => {
        expect(typeof preset.level).toBe('string');
        expect(typeof preset.includeRulesContent).toBe('boolean');
        expect(typeof preset.includeSkillContent).toBe('boolean');
        expect(typeof preset.includeAgentPrompt).toBe('boolean');
        expect(typeof preset.maxExpertiseItems).toBe('number');
        expect(typeof preset.maxContextSections).toBe('number');
      });
    });

    it('should have consistent level property in each preset', () => {
      expect(VERBOSITY_PRESETS.minimal.level).toBe('minimal');
      expect(VERBOSITY_PRESETS.standard.level).toBe('standard');
      expect(VERBOSITY_PRESETS.full.level).toBe('full');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple calls to getVerbosityConfig', () => {
      const configs = [
        getVerbosityConfig('minimal'),
        getVerbosityConfig('standard'),
        getVerbosityConfig('full'),
        getVerbosityConfig(),
      ];

      expect(configs).toHaveLength(4);
      configs.forEach(config => {
        expect(config).toBeDefined();
        expect(config.level).toMatch(/^(minimal|standard|full)$/);
      });
    });

    it('should handle isUnlimited with extreme values', () => {
      expect(isUnlimited(Number.MAX_SAFE_INTEGER)).toBe(false);
      expect(isUnlimited(Number.MIN_SAFE_INTEGER)).toBe(false);
      expect(isUnlimited(Infinity)).toBe(false);
      expect(isUnlimited(-Infinity)).toBe(false);
    });

    it('should handle fractional numbers in isUnlimited', () => {
      expect(isUnlimited(-1.0)).toBe(true);
      expect(isUnlimited(-1.5)).toBe(false);
      expect(isUnlimited(-0.5)).toBe(false);
      expect(isUnlimited(0.5)).toBe(false);
    });
  });

  describe('Documentation examples', () => {
    it('should match getVerbosityConfig example', () => {
      const config = getVerbosityConfig('minimal');
      expect(config.includeRulesContent).toBe(false);

      const defaultConfig = getVerbosityConfig();
      expect(defaultConfig.level).toBe('standard');
    });

    it('should match isUnlimited example', () => {
      expect(isUnlimited(-1)).toBe(true);
      expect(isUnlimited(5)).toBe(false);
      expect(isUnlimited(0)).toBe(false);
    });

    it('should match VERBOSITY_PRESETS example', () => {
      const config = VERBOSITY_PRESETS.standard;
      expect(config.includeRulesContent).toBe(true);
    });
  });
});
