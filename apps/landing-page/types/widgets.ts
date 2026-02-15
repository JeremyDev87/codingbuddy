/**
 * Widget Common Type Definitions
 * @description Landing page 위젯 공용 타입
 */

import type { SupportedLocale } from '@/lib/locale';

/** 위젯 기본 Props */
export interface WidgetProps {
  /** i18n 로케일 */
  locale: SupportedLocale;
}

/** Parallel Route Slot Props (locale validated by layout) */
export interface SlotProps {
  params: Promise<{ locale: SupportedLocale }>;
}

/** 코드 비교 예시 Props */
export interface CodeExampleProps extends WidgetProps {
  /** 변경 전 코드 */
  beforeCode: string;
  /** 변경 후 코드 */
  afterCode: string;
}

/** 빠른 시작 가이드 단계 */
export interface QuickStartStep {
  /** 단계 번호 */
  step: number;
  /** 단계 제목 */
  title: string;
  /** 코드 스니펫 */
  code: string;
  /** 코드 언어 (bash, json 등) */
  language?: string;
}
