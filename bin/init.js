#!/usr/bin/env node

/**
 * CLI initialization script for vite-mode-logging
 */

const { initViteLogging } = require('../dist/init.js');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Simple argument parsing
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--no-all':
      options.includeAll = false;
      break;
    case '--custom-modes':
      i++;
      if (i < args.length) {
        options.customModes = args[i].split(',').map(m => m.trim());
      }
      break;
    case '--help':
    case '-h':
      console.log(`
Usage: vite-logging-init [options]

Options:
  -v, --verbose          Show detailed output during setup
  --no-all              Don't include the ALL() function
  --custom-modes <list>  Comma-separated list of custom modes to include
  -h, --help            Show this help message

Examples:
  vite-logging-init
  vite-logging-init --verbose
  vite-logging-init --custom-modes staging,testing
  vite-logging-init --no-all --custom-modes prod
`);
      process.exit(0);
      break;
  }
}

// Run initialization
try {
  initViteLogging(options);
} catch (error) {
  console.error('Failed to initialize vite-mode-logging:', error.message);
  process.exit(1);
}