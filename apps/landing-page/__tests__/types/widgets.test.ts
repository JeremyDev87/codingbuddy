import { describe, test, expect } from 'vitest';
import type {
  WidgetProps,
  CodeExampleProps,
  QuickStartStep,
} from '../../types/widgets';

describe('Widget types', () => {
  test('WidgetProps has locale property', () => {
    const props: WidgetProps = { locale: 'ko' };

    expect(props.locale).toBe('ko');
  });

  test('CodeExampleProps extends WidgetProps', () => {
    const props: CodeExampleProps = {
      locale: 'en',
      beforeCode: 'const x = 1;',
      afterCode: 'const x: number = 1;',
    };

    expect(props.locale).toBe('en');
    expect(props.beforeCode).toBeDefined();
    expect(props.afterCode).toBeDefined();
  });

  test('QuickStartStep has required properties', () => {
    const step: QuickStartStep = {
      step: 1,
      title: 'Install dependencies',
      code: 'yarn add codingbuddy',
    };

    expect(step.step).toBe(1);
    expect(step.title).toBe('Install dependencies');
    expect(step.code).toBeDefined();
  });

  test('QuickStartStep language is optional', () => {
    const stepWithLang: QuickStartStep = {
      step: 2,
      title: 'Configure',
      code: '{ "name": "project" }',
      language: 'json',
    };
    const stepWithoutLang: QuickStartStep = {
      step: 1,
      title: 'Install',
      code: 'yarn add codingbuddy',
    };

    expect(stepWithLang.language).toBe('json');
    expect(stepWithoutLang.language).toBeUndefined();
  });
});
