/**
 * PLAN Agent Strategy Tests
 *
 * Tests for the PlanAgentStrategy class including:
 * - Explicit agent request handling
 * - Architecture-focused keyword detection
 * - Planning-focused keyword detection
 * - Priority ordering between patterns
 * - Default fallback behavior
 */

import { describe, it, expect } from 'vitest';
import { PlanAgentStrategy } from './plan-agent.strategy';
import { createPlanContext } from './__tests__/strategy-test.utils';

describe('PlanAgentStrategy', () => {
  const strategy = new PlanAgentStrategy();

  describe('explicit agent request', () => {
    it('should return solution-architect when explicitly requested', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Use solution-architect for this task',
        }),
      );

      expect(result.agentName).toBe('solution-architect');
      expect(result.source).toBe('explicit');
      expect(result.confidence).toBe(1.0);
    });

    it('should return technical-planner when explicitly requested', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Use technical-planner for this implementation plan',
        }),
      );

      expect(result.agentName).toBe('technical-planner');
      expect(result.source).toBe('explicit');
      expect(result.confidence).toBe(1.0);
    });

    it('should ignore explicit request for unavailable agent', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Use solution-architect for this task',
          availableAgents: ['technical-planner'], // solution-architect not available
        }),
      );

      // Should fall back to pattern matching or default
      expect(result.agentName).toBe('technical-planner');
    });

    it('should ignore explicit request for non-PLAN agent', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Use frontend-developer for this task',
        }),
      );

      // frontend-developer is not a PLAN mode agent, should fall back
      expect(result.agentName).not.toBe('frontend-developer');
    });
  });

  describe('architecture-focused keywords', () => {
    describe('English and Korean', () => {
      const architecturePrompts = [
        'Design the system architecture for this feature',
        'API 설계를 해주세요',
        '시스템 설계가 필요합니다',
        'Review the microservice structure',
        'Evaluate the technology choices',
        'Define the system structure',
      ];

      it.each(architecturePrompts)('should detect architecture intent: "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Japanese (日本語)', () => {
      const jaPrompts = [
        'アーキテクチャを設計してください', // Please design the architecture
        'システムの構造を決めてください', // Please determine the system structure
        'API設計をお願いします', // Please do API design
      ];

      it.each(jaPrompts)('should detect architecture intent (JA): "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Chinese (中文)', () => {
      const zhPrompts = [
        '请设计系统架构', // Please design the system architecture
        '帮我规划项目结构', // Help me plan the project structure
        '分析一下设计方案', // Analyze the design solution
      ];

      it.each(zhPrompts)('should detect architecture intent (ZH): "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Spanish (Español)', () => {
      const esPrompts = [
        'Diseña la arquitectura del sistema', // Design the system architecture
        'Define la estructura del proyecto', // Define the project structure
        'Revisa el diseño de la API', // Review the API design
      ];

      it.each(esPrompts)('should detect architecture intent (ES): "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('solution-architect');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });
  });

  describe('planning-focused keywords', () => {
    describe('English and Korean', () => {
      const planningPrompts = [
        '구현 계획을 세워주세요',
        'Create a step-by-step implementation plan',
        'Define the TDD approach for this feature',
        'Plan the refactoring steps',
        '태스크 분해를 해주세요',
      ];

      it.each(planningPrompts)('should detect planning intent: "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Japanese (日本語)', () => {
      const jaPrompts = [
        '計画を立ててください', // Please make a plan
        'ロードマップを作成してください', // Please create a roadmap
        'リファクタリングの手順を決めてください', // Please decide the refactoring steps
      ];

      it.each(jaPrompts)('should detect planning intent (JA): "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Chinese (中文)', () => {
      const zhPrompts = [
        '请制定实现计划', // Please make an implementation plan
        '帮我创建路线图', // Help me create a roadmap
        '请进行代码重构', // Please do code refactoring
      ];

      it.each(zhPrompts)('should detect planning intent (ZH): "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });

    describe('Spanish (Español)', () => {
      const esPrompts = [
        'Crea un cronograma para este proyecto', // Create a schedule for this project
        'Ayúdame a planificar la implementación', // Help me plan the implementation
        'Necesito refactorizar este módulo', // I need to refactor this module
      ];

      it.each(esPrompts)('should detect planning intent (ES): "%s"', async prompt => {
        const result = await strategy.resolve(createPlanContext({ prompt }));

        expect(result.agentName).toBe('technical-planner');
        expect(result.source).toBe('intent');
        expect(result.confidence).toBe(0.9);
      });
    });
  });

  describe('pattern priority', () => {
    it('should prefer solution-architect when both patterns match', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Plan the architecture and implementation steps',
        }),
      );

      expect(result.agentName).toBe('solution-architect');
      expect(result.source).toBe('intent');
      expect(result.confidence).toBe(0.85); // Lower confidence when both match
    });

    it('should prefer explicit request over pattern matching', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Use technical-planner for the architecture design',
        }),
      );

      expect(result.agentName).toBe('technical-planner');
      expect(result.source).toBe('explicit');
    });
  });

  describe('default fallback', () => {
    it('should return solution-architect by default', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Help me with this feature',
        }),
      );

      expect(result.agentName).toBe('solution-architect');
      expect(result.source).toBe('default');
      expect(result.confidence).toBe(1.0);
    });

    it('should fallback to technical-planner if solution-architect unavailable', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Help me with this feature',
          availableAgents: ['technical-planner', 'frontend-developer'],
        }),
      );

      expect(result.agentName).toBe('technical-planner');
      expect(result.source).toBe('default');
    });

    it('should fallback to DEFAULT_ACT_AGENT if no PLAN agents available', async () => {
      const result = await strategy.resolve(
        createPlanContext({
          prompt: 'Help me with this feature',
          availableAgents: ['software-engineer', 'frontend-developer', 'backend-developer'],
        }),
      );

      expect(result.agentName).toBe('software-engineer');
      expect(result.source).toBe('default');
    });
  });

  describe('result structure', () => {
    it('should return PrimaryAgentResolutionResult interface', async () => {
      const result = await strategy.resolve(createPlanContext());

      expect(result).toHaveProperty('agentName');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reason');
    });

    it('should include descriptive reason', async () => {
      const result = await strategy.resolve(
        createPlanContext({ prompt: 'Design the system architecture' }),
      );

      expect(result.reason).toContain('Architecture');
    });
  });
});
