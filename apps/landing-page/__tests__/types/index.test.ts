import { describe, test, expect } from 'vitest';
import type {
  Agent,
  AgentCategory,
  AgentFilter,
  WidgetProps,
  CodeExampleProps,
  QuickStartStep,
} from '../../types';

describe('types barrel export', () => {
  test('all agent types are re-exported', () => {
    const agent: Agent = {
      id: 'test',
      name: 'Test',
      description: 'Test agent',
      category: 'Development',
      icon: '🧪',
      tags: [],
      expertise: [],
    };
    const filter: AgentFilter = { category: 'all' };
    const category: AgentCategory = 'Planning';

    expect(agent).toBeDefined();
    expect(filter).toBeDefined();
    expect(category).toBeDefined();
  });

  test('all widget types are re-exported', () => {
    const widget: WidgetProps = { locale: 'ko' };
    const codeExample: CodeExampleProps = {
      locale: 'en',
      beforeCode: '',
      afterCode: '',
    };
    const step: QuickStartStep = {
      step: 1,
      title: 'Test',
      code: '',
    };

    expect(widget).toBeDefined();
    expect(codeExample).toBeDefined();
    expect(step).toBeDefined();
  });
});
