/**
 * AI Agent Type Definitions
 * @description Landing page에서 사용하는 AI 에이전트 공용 타입
 */

/** 에이전트 카테고리 분류 */
export type AgentCategory = 'Planning' | 'Development' | 'Review' | 'Security' | 'UX';

/** AI 에이전트 인터페이스 */
export interface Agent {
  /** 고유 에이전트 ID */
  id: string;
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 설명 */
  description: string;
  /** 카테고리 (Planning, Development, Review, Security, UX) */
  category: AgentCategory;
  /** 아이콘 이모지 */
  icon: string;
  /** 태그 목록 */
  tags: string[];
  /** 전문 분야 */
  expertise: string[];
}

/** 에이전트 필터링 옵션 */
export interface AgentFilter {
  /** 카테고리 필터 ('all'이면 전체) */
  category?: AgentCategory | 'all';
  /** 검색어 */
  searchQuery?: string;
}
