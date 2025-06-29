import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

/**
 * Ensures the debug.ts file has a global declaration for the current mode
 */
function ensureModeFunction(mode: string) {
  const debugFilePath = path.resolve(__dirname, 'src/debug.ts')
  
  // Read the current content
  let content = ''
  try {
    content = fs.readFileSync(debugFilePath, 'utf-8')
  } catch (e) {
    // File doesn't exist, we'll create it with the base structure
    content = `// Mode-based logging helper functions that will be transformed by the build process
// These functions are declared globally and can be used anywhere without imports

declare global {
  function ALL(message: string): void;
}

// Make the functions available at runtime (though they'll be transformed)
(globalThis as any).ALL = function(_message: string) { /* no-op */ };

export {}; // Make this a module
`
  }

  // Convert mode to uppercase for the function name
  const functionName = mode.toUpperCase()
  
  // Check if global declaration already exists
  const globalDeclRegex = new RegExp(`function\\s+${functionName}\\s*\\(`, 'i')
  if (!globalDeclRegex.test(content)) {
    // Find the declare global block and add the function
    const globalBlockRegex = /(declare global \{[^}]*)(})/s
    if (globalBlockRegex.test(content)) {
      content = content.replace(globalBlockRegex, `$1  function ${functionName}(message: string): void;\n$2`)
    } else {
      // Add new global block
      const newGlobalBlock = `
declare global {
  function ${functionName}(message: string): void;
}
`
      content = newGlobalBlock + content
    }
    
    // Also add runtime implementation
    const runtimeImpl = `(globalThis as any).${functionName} = function(_message: string) { /* no-op */ };\n`
    const exportIndex = content.lastIndexOf('export {};')
    if (exportIndex !== -1) {
      content = content.slice(0, exportIndex) + runtimeImpl + content.slice(exportIndex)
    } else {
      content += runtimeImpl + '\nexport {};\n'
    }
    
    fs.writeFileSync(debugFilePath, content, 'utf-8')
    console.log(`Added ${functionName} global function to debug.ts`)
  }

  // Always ensure ALL function exists in global declarations
  const allGlobalRegex = /function\s+ALL\s*\(/i
  if (!allGlobalRegex.test(content)) {
    content = fs.readFileSync(debugFilePath, 'utf-8')
    const globalBlockRegex = /(declare global \{[^}]*)(})/s
    if (globalBlockRegex.test(content)) {
      content = content.replace(globalBlockRegex, `$1  function ALL(message: string): void;\n$2`)
    }
    
    const runtimeImpl = `(globalThis as any).ALL = function(_message: string) { /* no-op */ };\n`
    const exportIndex = content.lastIndexOf('export {};')
    if (exportIndex !== -1) {
      content = content.slice(0, exportIndex) + runtimeImpl + content.slice(exportIndex)
    }
    
    fs.writeFileSync(debugFilePath, content, 'utf-8')
    console.log('Added ALL global function to debug.ts')
  }
}

/**
 * Vite plugin that transforms mode-specific logging function calls to console.log() statements
 * based on the current Vite mode.
 * 
 * Functions are available globally without imports:
 * - In development mode: DEV("message") → console.log("message")
 * - In willywonka mode: WILLYWONKA("message") → console.log("message")
 * - In any mode: ALL("message") → console.log("message")
 * 
 * Logging calls for other modes are removed from the output.
 */
export function modeBasedLoggingPlugin(mode: string): Plugin {
  // Ensure the mode function exists in debug.ts
  ensureModeFunction(mode)
  
  return {
    name: 'mode-based-logging',
    enforce: 'pre',
    transform(code: string, id: string) {
      // Only process .ts, .tsx, .js, .jsx files
      if (!/\.(tsx?|jsx?)$/.test(id)) return
      
      // Skip the debug.ts file itself to avoid circular transformations
      if (id.includes('debug.ts')) return

      // Convert mode to uppercase for matching
      const currentModeUpper = mode.toUpperCase()
      
      // Create regex to match any mode-based logging call
      // This matches: MODENAME(...) where MODENAME is any uppercase word
      const allModesRegex = /\b([A-Z][A-Z0-9_]*)\s*\(((?:[^)(]|\([^)]*\))*)\)/g

      const transformed = code.replace(allModesRegex, (_, modeName, args) => {
        // ALL function always gets transformed
        if (modeName === 'ALL') {
          return `console.log(${args})`
        }
        
        // Check if this logging call matches the current mode
        if (modeName === currentModeUpper) {
          // Transform to console.log for matching mode
          return `console.log(${args})`
        } else {
          // Remove logging calls for non-matching modes
          // Return empty string to remove the statement
          return ''
        }
      })

      if (transformed !== code) {
        return {
          code: transformed,
          map: null // Source maps could be added here if needed
        }
      }
    }
  }
}