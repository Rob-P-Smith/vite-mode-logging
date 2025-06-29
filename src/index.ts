/**
 * Vite Mode Logging - A mode-based logging system for Vite projects
 * 
 * Provides mode-specific logging functions that are automatically transformed
 * during build time based on the current Vite mode.
 */

export { modeBasedLoggingPlugin } from './plugin';
export { initViteLogging } from './init';

// Types
export interface ViteLoggingOptions {
  /** Custom modes to include beyond package.json scripts */
  customModes?: string[];
  /** Whether to include ALL function that always logs */
  includeAll?: boolean;
  /** Debug output during initialization */
  verbose?: boolean;
}