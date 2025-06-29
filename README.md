# Vite Mode Logging

A powerful mode-based logging system for Vite projects that provides clean, organized logging with automatic setup and zero runtime overhead.

## Features

- 🎯 **Mode-specific logging** - Different log messages for different modes (dev, debug, production, custom modes)
- 🚀 **Zero runtime overhead** - Logs are removed during build unless specifically enabled
- 🔧 **Automatic setup** - One command sets up everything in your project
- 📝 **TypeScript support** - Full type safety with global function declarations
- 🎨 **Clean syntax** - No imports needed, functions available globally
- ⚡ **Vite integration** - Built specifically for Vite's mode system

## Installation

```bash
npm install vite-mode-logging --save-dev
```

## Quick Start

1. **Initialize in your project:**
   ```bash
   npx vite-logging-init
   ```

2. **Start using mode-based logging:**
   ```typescript
   // Available globally, no imports needed!
   DEV("This only shows in development mode");
   DEBUG("This only shows in debug mode");
   PROD("This only shows in production mode");
   ALL("This always shows regardless of mode");
   ```

3. **Run your scripts:**
   ```bash
   npm run dev     # Only sees DEV() and ALL() logs
   npm run debug   # Only sees DEBUG() and ALL() logs  
   npm run build   # Removes all logs in production
   ```

## How It Works

### Mode Detection
The system automatically detects your npm scripts and creates logging functions for each mode:

```json
{
  "scripts": {
    "dev": "vite",
    "debug": "vite --mode debug",
    "staging": "vite --mode staging",
    "willywonka": "vite --mode willywonka"
  }
}
```

Creates these global functions:
- `DEV()` - only logs in development mode
- `DEBUG()` - only logs in debug mode  
- `STAGING()` - only logs in staging mode
- `WILLYWONKA()` - only logs in willywonka mode
- `ALL()` - always logs regardless of mode

### Build-time Transformation

During compilation, the Vite plugin:
1. Transforms matching mode functions to `console.log()`
2. Completely removes non-matching mode functions
3. Preserves `ALL()` functions in all modes
4. Removes all console logs in production builds

## Manual Setup

If you prefer manual setup or need custom configuration:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { modeBasedLoggingPlugin } from 'vite-mode-logging'

export default defineConfig(({ mode, command }) => ({
  plugins: [
    modeBasedLoggingPlugin(mode),
    // your other plugins
  ],
  esbuild: {
    // Only remove console logs in production builds
    drop: command === 'build' && mode === 'production' ? ['console'] : [],
    dropLabels: command === 'build' && mode === 'production' ? ['DEBUG'] : []
  }
}))
```

## Usage Examples

### Basic Logging
```typescript
// Component.tsx - no imports needed!
function MyComponent() {
  DEV("Component rendered in development");
  DEBUG("Detailed component info for debugging");
  STAGING("Component loaded in staging environment");
  ALL("Component initialized"); // Always shows
  
  return <div>Hello World</div>;
}
```

### Conditional Logging
```typescript
function processData(data: unknown[]) {
  ALL(`Processing ${data.length} items`);
  
  if (import.meta.env.MODE === 'debug') {
    DEBUG("Entering debug mode processing");
    data.forEach((item, index) => {
      DEBUG(`Item ${index}:`, item);
    });
  }
  
  DEV("Development processing complete");
  PROD("Data processed successfully");
}
```

### Custom Modes
```bash
# Add custom script
npm pkg set scripts.willywonka="vite --mode willywonka"

# Use it in code
WILLYWONKA("Welcome to the chocolate factory!");

# Run it
npm run willywonka  # Only WILLYWONKA() and ALL() logs appear
```

## CLI Options

```bash
# Basic setup
npx vite-logging-init

# Verbose output
npx vite-logging-init --verbose

# Custom modes
npx vite-logging-init --custom-modes staging,testing,prod

# Without ALL function
npx vite-logging-init --no-all

# Help
npx vite-logging-init --help
```

## Configuration Options

```typescript
interface ViteLoggingOptions {
  /** Custom modes to include beyond package.json scripts */
  customModes?: string[];
  /** Whether to include ALL function that always logs */
  includeAll?: boolean;
  /** Debug output during initialization */
  verbose?: boolean;
}
```

## TypeScript Support

The package automatically creates global TypeScript declarations:

```typescript
// Generated in src/debug.ts
declare global {
  function DEV(message: string): void;
  function DEBUG(message: string): void;
  function PROD(message: string): void;
  function ALL(message: string): void;
  // ... other modes
}
```

## File Structure After Setup

```
your-project/
├── src/
│   ├── debug.ts              # Global function declarations
│   └── main.tsx              # Updated with debug import
├── vite.config.ts            # Updated with plugin
├── viteLogging.config.ts     # Plugin configuration
└── package.json              # Your existing scripts
```

## Best Practices

### 1. Use Semantic Mode Names
```typescript
DEV("Quick development info");
DEBUG("Detailed debugging information");  
STAGING("Staging environment checks");
PROD("Production logging");
ALL("Critical information for all environments");
```

### 2. Leverage Template Literals
```typescript
const userId = 123;
DEV(`User ${userId} logged in`);
DEBUG(`User data: ${JSON.stringify(userData)}`);
```

### 3. Performance Logging
```typescript
function expensiveOperation() {
  ALL("Starting expensive operation");
  const start = performance.now();
  
  // ... operation code
  
  DEBUG(`Operation completed in ${performance.now() - start}ms`);
}
```

## Troubleshooting

### Functions Not Recognized
Make sure `src/debug.ts` is imported in your main entry file:
```typescript
// src/main.tsx
import './debug' // This should be added automatically
```

### Logs Not Appearing
1. Check that you're running the correct script: `npm run debug` for DEBUG() logs
2. Verify the plugin is properly configured in `vite.config.ts`
3. Ensure esbuild isn't removing console logs in development

### TypeScript Errors
If you get "Cannot find name" errors, ensure:
1. `src/debug.ts` exists and has global declarations
2. The debug file is imported in your main entry point
3. TypeScript can find the global declarations

## Contributing

No contributions will be accepted, this is a tool for my needs but you're free to use it if you want to.

## License

MIT License - see LICENSE file for details.

## Changelog

### 1.0.0
- Initial release
- Automatic project setup
- Mode-based logging system
- TypeScript support
- Vite plugin integration