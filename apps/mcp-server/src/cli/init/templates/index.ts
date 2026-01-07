/**
 * Templates Module
 *
 * Template-based config generation system
 */

// Types
export type {
  FrameworkType,
  TemplateMetadata,
  ConfigTemplate,
  ConfigComments,
  TemplateSelectionResult,
  TemplateRenderOptions,
} from './template.types';

// Template selection
export {
  selectTemplate,
  getTemplateById,
  getAllTemplates,
} from './template.selector';

// Template rendering
export { renderConfigAsJs, renderConfigAsJson } from './template.renderer';

// Config object rendering (for wizard)
export {
  renderConfigObjectAsJs,
  renderConfigObjectAsJson,
  escapeJsString,
} from './config-renderer';

// Individual templates
export { TEMPLATES } from './frameworks';
