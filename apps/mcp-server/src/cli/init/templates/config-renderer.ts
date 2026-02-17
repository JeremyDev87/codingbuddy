/**
 * Config Renderer
 *
 * Renders config objects (from wizard) to JSON format
 *
 * Only JSON format is supported to ensure compatibility with both
 * CommonJS and ESM projects.
 */

interface ConfigObject {
  language?: string;
  projectName?: string;
  description?: string;
  techStack?: {
    languages?: string[];
    frontend?: string[];
    backend?: string[];
    database?: string[];
    infrastructure?: string[];
    tools?: string[];
  };
  architecture?: {
    pattern?: string;
    componentStyle?: string;
    structure?: string[];
  };
  conventions?: {
    naming?: {
      files?: string;
      components?: string;
      functions?: string;
      variables?: string;
    };
    quotes?: string;
    semicolons?: boolean;
  };
  testStrategy?: {
    approach?: string;
    coverage?: number;
    mockingStrategy?: string;
    frameworks?: string[];
  };
  ai?: {
    defaultModel?: string;
    primaryAgent?: string;
  };
}

/**
 * Render a config object as JSON
 */
export function renderConfigObjectAsJson(config: ConfigObject): string {
  const cleanedConfig = cleanConfig(config);
  return JSON.stringify(cleanedConfig, null, 2);
}

/**
 * Clean config by removing empty arrays and undefined values
 */
function cleanConfig(config: ConfigObject): ConfigObject {
  const result: ConfigObject = {};

  if (config.language) result.language = config.language;
  if (config.projectName) result.projectName = config.projectName;
  if (config.description) result.description = config.description;

  if (config.techStack) {
    const techStack: ConfigObject['techStack'] = {};
    if (config.techStack.languages?.length) techStack.languages = config.techStack.languages;
    if (config.techStack.frontend?.length) techStack.frontend = config.techStack.frontend;
    if (config.techStack.backend?.length) techStack.backend = config.techStack.backend;
    if (config.techStack.database?.length) techStack.database = config.techStack.database;
    if (config.techStack.infrastructure?.length)
      techStack.infrastructure = config.techStack.infrastructure;
    if (config.techStack.tools?.length) techStack.tools = config.techStack.tools;
    if (hasProperties(techStack)) result.techStack = techStack;
  }

  if (config.architecture) {
    const arch: ConfigObject['architecture'] = {};
    if (config.architecture.pattern) arch.pattern = config.architecture.pattern;
    if (config.architecture.componentStyle)
      arch.componentStyle = config.architecture.componentStyle;
    if (config.architecture.structure?.length) arch.structure = config.architecture.structure;
    if (hasProperties(arch)) result.architecture = arch;
  }

  if (config.conventions) {
    const conv: ConfigObject['conventions'] = {};
    if (config.conventions.naming && hasProperties(config.conventions.naming)) {
      conv.naming = {};
      if (config.conventions.naming.files) conv.naming.files = config.conventions.naming.files;
      if (config.conventions.naming.components)
        conv.naming.components = config.conventions.naming.components;
      if (config.conventions.naming.functions)
        conv.naming.functions = config.conventions.naming.functions;
      if (config.conventions.naming.variables)
        conv.naming.variables = config.conventions.naming.variables;
    }
    if (config.conventions.quotes) conv.quotes = config.conventions.quotes;
    if (config.conventions.semicolons !== undefined)
      conv.semicolons = config.conventions.semicolons;
    if (hasProperties(conv)) result.conventions = conv;
  }

  if (config.testStrategy) {
    const test: ConfigObject['testStrategy'] = {};
    if (config.testStrategy.approach) test.approach = config.testStrategy.approach;
    if (config.testStrategy.coverage !== undefined) test.coverage = config.testStrategy.coverage;
    if (config.testStrategy.mockingStrategy)
      test.mockingStrategy = config.testStrategy.mockingStrategy;
    if (config.testStrategy.frameworks?.length) test.frameworks = config.testStrategy.frameworks;
    if (hasProperties(test)) result.testStrategy = test;
  }

  if (config.ai) {
    const ai: ConfigObject['ai'] = {};
    if (config.ai.defaultModel) ai.defaultModel = config.ai.defaultModel;
    if (config.ai.primaryAgent) ai.primaryAgent = config.ai.primaryAgent;
    if (hasProperties(ai)) result.ai = ai;
  }

  return result;
}

/**
 * Check if object has any defined properties
 */
function hasProperties(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some(v => v !== undefined && v !== null);
}
