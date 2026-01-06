/**
 * Template Types
 *
 * Type definitions for the template-based config generation system
 */

import type { CodingBuddyConfig } from '../../../config';

/**
 * Supported framework templates
 */
export type FrameworkType =
  | 'nextjs'
  | 'react'
  | 'nestjs'
  | 'express'
  | 'node'
  | 'default';

/**
 * Template metadata
 */
export interface TemplateMetadata {
  /** Template identifier */
  id: FrameworkType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Frameworks this template applies to */
  matchPatterns: string[];
}

/**
 * Complete template definition
 */
export interface ConfigTemplate {
  /** Template metadata */
  metadata: TemplateMetadata;
  /** Base configuration */
  config: CodingBuddyConfig;
  /** Comments for each config section (for JS output) */
  comments: ConfigComments;
}

/**
 * Comments structure for config sections
 */
export interface ConfigComments {
  /** Header comment for the file */
  header: string;
  /** Comment for language setting */
  language?: string;
  /** Comment for project info section */
  projectInfo?: string;
  /** Comment for techStack section */
  techStack?: string;
  /** Comment for architecture section */
  architecture?: string;
  /** Comment for conventions section */
  conventions?: string;
  /** Comment for testStrategy section */
  testStrategy?: string;
  /** Footer comment with tips */
  footer?: string;
}

/**
 * Template selection result
 */
export interface TemplateSelectionResult {
  /** Selected template */
  template: ConfigTemplate;
  /** Reason for selection */
  reason: string;
  /** Detected frameworks that influenced selection */
  detectedFrameworks: string[];
}

/**
 * Options for template rendering
 */
export interface TemplateRenderOptions {
  /** Response language ('ko', 'en', etc.) */
  language?: string;
  /** Project name override */
  projectName?: string;
  /** Include detailed comments */
  includeComments?: boolean;
  /** Default AI model (e.g., 'claude-sonnet-4-20250514') */
  defaultModel?: string;
}
