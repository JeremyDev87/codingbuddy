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

  test('CodeExampleProps is equivalent to WidgetProps', () => {
    const props: CodeExampleProps = {
      locale: 'en',
    };

    expect(props.locale).toBe('en');
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

});
