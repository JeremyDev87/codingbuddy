/**
 * EditorConfig conventions
 * @see https://editorconfig.org/
 */
export interface EditorConfigConventions {
  indent_style?: 'space' | 'tab';
  indent_size?: number;
  tab_width?: number;
  end_of_line?: 'lf' | 'cr' | 'crlf';
  charset?: 'latin1' | 'utf-8' | 'utf-16be' | 'utf-16le' | 'utf-8-bom';
  trim_trailing_whitespace?: boolean;
  insert_final_newline?: boolean;
  max_line_length?: number;
}

/**
 * TypeScript compiler options (subset relevant for conventions)
 */
export interface TypeScriptConventions {
  strict?: boolean;
  noImplicitAny?: boolean;
  strictNullChecks?: boolean;
  strictFunctionTypes?: boolean;
  strictBindCallApply?: boolean;
  noImplicitThis?: boolean;
  alwaysStrict?: boolean;
  target?: string;
  module?: string;
  moduleResolution?: string;
  esModuleInterop?: boolean;
  paths?: Record<string, string[]>;
}

/**
 * ESLint rule severity levels
 */
export type ESLintRuleSeverity = 'off' | 'warn' | 'error' | 0 | 1 | 2;

/**
 * ESLint rule configuration
 * Can be severity level or [severity, ...options]
 */
export type ESLintRuleConfig = ESLintRuleSeverity | [ESLintRuleSeverity, ...unknown[]];

/**
 * ESLint parser options (common fields)
 */
export interface ESLintParserOptions {
  ecmaVersion?: number | 'latest';
  sourceType?: 'script' | 'module';
  ecmaFeatures?: {
    jsx?: boolean;
    globalReturn?: boolean;
    impliedStrict?: boolean;
  };
  [key: string]: unknown;
}

/**
 * ESLint configuration (simplified representation)
 */
export interface ESLintConventions {
  configType: 'flat' | 'legacy';
  parser?: string;
  parserOptions?: ESLintParserOptions;
  rules?: Record<string, ESLintRuleConfig>;
  extends?: string | string[];
}

/**
 * Prettier configuration
 */
export interface PrettierConventions {
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  quoteProps?: 'as-needed' | 'consistent' | 'preserve';
  jsxSingleQuote?: boolean;
  trailingComma?: 'none' | 'es5' | 'all';
  bracketSpacing?: boolean;
  bracketSameLine?: boolean;
  arrowParens?: 'always' | 'avoid';
  endOfLine?: 'lf' | 'crlf' | 'cr' | 'auto';
}

/**
 * Markdownlint rule configuration
 * Can be boolean or object with rule-specific options
 */
export type MarkdownLintRuleConfig = boolean | { style?: string; [key: string]: unknown };

/**
 * Markdownlint configuration
 */
export interface MarkdownLintConventions {
  default?: boolean;
  [rule: string]: boolean | MarkdownLintRuleConfig | undefined;
}

/**
 * Complete project conventions from all config files
 */
export interface ProjectConventions {
  projectRoot: string;
  typescript: TypeScriptConventions;
  eslint: ESLintConventions;
  prettier: PrettierConventions;
  editorconfig: EditorConfigConventions;
  markdownlint: MarkdownLintConventions;
}

/**
 * Parameters for get_code_conventions MCP tool
 */
export interface GetCodeConventionsParams {
  projectRoot?: string;
}

/**
 * Default conventions when config files are missing
 */
export const DEFAULT_EDITOR_CONFIG: EditorConfigConventions = {
  indent_style: 'space',
  indent_size: 2,
  end_of_line: 'lf',
  charset: 'utf-8',
  trim_trailing_whitespace: true,
  insert_final_newline: true,
};

export const DEFAULT_TYPESCRIPT_CONFIG: TypeScriptConventions = {
  strict: true,
  noImplicitAny: true,
  target: 'ES2021',
  module: 'commonjs',
};

export const DEFAULT_ESLINT_CONFIG: ESLintConventions = {
  configType: 'flat',
  rules: {},
};

export const DEFAULT_PRETTIER_CONFIG: PrettierConventions = {
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
};

export const DEFAULT_MARKDOWNLINT_CONFIG: MarkdownLintConventions = {
  default: true,
};
