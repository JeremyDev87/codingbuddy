/**
 * Schema validation for checklist JSON files
 */

import {
  CHECKLIST_PRIORITIES,
  CHECKLIST_DOMAINS,
  type ChecklistDefinition,
  type ChecklistCategory,
  type ChecklistItem,
  type ChecklistPriority,
  type ChecklistDomain,
} from './checklist.types';

/** Valid priority values (derived from shared constants) */
const VALID_PRIORITIES: ReadonlySet<ChecklistPriority> = new Set(
  CHECKLIST_PRIORITIES,
);

/** Valid domain values (derived from shared constants) */
const VALID_DOMAINS: ReadonlySet<ChecklistDomain> = new Set(CHECKLIST_DOMAINS);

/**
 * Schema validation error with details
 */
export class ChecklistSchemaError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly value?: unknown,
  ) {
    super(`${message} at ${path}`);
    this.name = 'ChecklistSchemaError';
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a checklist item
 */
function validateItem(item: unknown, path: string): string[] {
  const errors: string[] = [];

  if (!item || typeof item !== 'object') {
    errors.push(`${path}: Expected object, got ${typeof item}`);
    return errors;
  }

  const obj = item as Record<string, unknown>;

  // Required: id
  if (typeof obj.id !== 'string' || obj.id.trim() === '') {
    errors.push(`${path}.id: Required non-empty string`);
  }

  // Required: text
  if (typeof obj.text !== 'string' || obj.text.trim() === '') {
    errors.push(`${path}.text: Required non-empty string`);
  }

  // Required: priority (must be valid value)
  if (typeof obj.priority !== 'string') {
    errors.push(`${path}.priority: Required string`);
  } else if (!VALID_PRIORITIES.has(obj.priority as ChecklistPriority)) {
    errors.push(
      `${path}.priority: Invalid value '${obj.priority}'. Must be one of: ${[...VALID_PRIORITIES].join(', ')}`,
    );
  }

  // Optional: reason (string if present)
  if (obj.reason !== undefined && typeof obj.reason !== 'string') {
    errors.push(`${path}.reason: Expected string, got ${typeof obj.reason}`);
  }

  // Optional: reference (string if present)
  if (obj.reference !== undefined && typeof obj.reference !== 'string') {
    errors.push(
      `${path}.reference: Expected string, got ${typeof obj.reference}`,
    );
  }

  return errors;
}

/**
 * Validate checklist triggers
 */
function validateTriggers(triggers: unknown, path: string): string[] {
  const errors: string[] = [];

  if (!triggers || typeof triggers !== 'object') {
    errors.push(`${path}: Expected object, got ${typeof triggers}`);
    return errors;
  }

  const obj = triggers as Record<string, unknown>;

  // Required: files (array of strings)
  if (!Array.isArray(obj.files)) {
    errors.push(`${path}.files: Required array`);
  } else {
    obj.files.forEach((file, i) => {
      if (typeof file !== 'string') {
        errors.push(`${path}.files[${i}]: Expected string, got ${typeof file}`);
      }
    });
  }

  // Optional: imports (array of strings if present)
  if (obj.imports !== undefined) {
    if (!Array.isArray(obj.imports)) {
      errors.push(`${path}.imports: Expected array`);
    } else {
      obj.imports.forEach((imp, i) => {
        if (typeof imp !== 'string') {
          errors.push(
            `${path}.imports[${i}]: Expected string, got ${typeof imp}`,
          );
        }
      });
    }
  }

  // Optional: patterns (array of strings if present)
  if (obj.patterns !== undefined) {
    if (!Array.isArray(obj.patterns)) {
      errors.push(`${path}.patterns: Expected array`);
    } else {
      obj.patterns.forEach((pattern, i) => {
        if (typeof pattern !== 'string') {
          errors.push(
            `${path}.patterns[${i}]: Expected string, got ${typeof pattern}`,
          );
        }
      });
    }
  }

  return errors;
}

/**
 * Validate a checklist category
 */
function validateCategory(category: unknown, path: string): string[] {
  const errors: string[] = [];

  if (!category || typeof category !== 'object') {
    errors.push(`${path}: Expected object, got ${typeof category}`);
    return errors;
  }

  const obj = category as Record<string, unknown>;

  // Required: name
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    errors.push(`${path}.name: Required non-empty string`);
  }

  // Required: triggers
  if (obj.triggers === undefined) {
    errors.push(`${path}.triggers: Required`);
  } else {
    errors.push(...validateTriggers(obj.triggers, `${path}.triggers`));
  }

  // Required: items (non-empty array)
  if (!Array.isArray(obj.items)) {
    errors.push(`${path}.items: Required array`);
  } else if (obj.items.length === 0) {
    errors.push(`${path}.items: Must have at least one item`);
  } else {
    obj.items.forEach((item, i) => {
      errors.push(...validateItem(item, `${path}.items[${i}]`));
    });
  }

  return errors;
}

/**
 * Validate a complete checklist definition
 *
 * @param data - The parsed JSON data to validate
 * @returns Validation result with errors if any
 */
export function validateChecklistSchema(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [`Root: Expected object, got ${typeof data}`],
    };
  }

  const obj = data as Record<string, unknown>;

  // Required: domain (must be valid value)
  if (typeof obj.domain !== 'string') {
    errors.push('domain: Required string');
  } else if (!VALID_DOMAINS.has(obj.domain as ChecklistDomain)) {
    errors.push(
      `domain: Invalid value '${obj.domain}'. Must be one of: ${[...VALID_DOMAINS].join(', ')}`,
    );
  }

  // Required: icon
  if (typeof obj.icon !== 'string' || obj.icon.trim() === '') {
    errors.push('icon: Required non-empty string');
  }

  // Required: description
  if (typeof obj.description !== 'string' || obj.description.trim() === '') {
    errors.push('description: Required non-empty string');
  }

  // Required: categories (non-empty array)
  if (!Array.isArray(obj.categories)) {
    errors.push('categories: Required array');
  } else if (obj.categories.length === 0) {
    errors.push('categories: Must have at least one category');
  } else {
    obj.categories.forEach((cat, i) => {
      errors.push(...validateCategory(cat, `categories[${i}]`));
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse and validate checklist JSON
 *
 * @param jsonContent - Raw JSON string content
 * @returns Validated ChecklistDefinition
 * @throws ChecklistSchemaError if validation fails
 */
export function parseAndValidateChecklist(
  jsonContent: string,
): ChecklistDefinition {
  let data: unknown;

  try {
    data = JSON.parse(jsonContent);
  } catch (error) {
    throw new ChecklistSchemaError(
      'Invalid JSON syntax',
      'root',
      error instanceof Error ? error.message : String(error),
    );
  }

  const result = validateChecklistSchema(data);

  if (!result.valid) {
    throw new ChecklistSchemaError(
      `Schema validation failed: ${result.errors.join('; ')}`,
      'root',
      result.errors,
    );
  }

  return data as ChecklistDefinition;
}

/**
 * Type guard for ChecklistItem
 */
export function isValidChecklistItem(item: unknown): item is ChecklistItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    typeof obj.priority === 'string' &&
    VALID_PRIORITIES.has(obj.priority as ChecklistPriority)
  );
}

/**
 * Type guard for ChecklistCategory
 */
export function isValidChecklistCategory(
  category: unknown,
): category is ChecklistCategory {
  if (!category || typeof category !== 'object') return false;
  const obj = category as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.triggers !== undefined &&
    typeof obj.triggers === 'object' &&
    Array.isArray(obj.items) &&
    obj.items.every(isValidChecklistItem)
  );
}
