import fs from 'fs'
import path from 'path'
import { ViteLoggingOptions } from './index'

interface PackageJson {
  scripts?: Record<string, string>;
}

/**
 * Initialize vite-mode-logging in a project
 */
export function initViteLogging(options: ViteLoggingOptions = {}) {
  const {
    customModes = [],
    includeAll = true,
    verbose = false
  } = options

  const projectRoot = process.cwd()
  const log = verbose ? console.log : () => {}

  log('[vite-mode-logging] Initializing...')

  try {
    // 1. Read package.json to get existing scripts
    const packageJsonPath = path.join(projectRoot, 'package.json')
    let packageJson: PackageJson = {}
    
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    } catch (e) {
      console.warn('[vite-mode-logging] Warning: Could not read package.json')
    }

    // Extract mode names from scripts
    const scriptModes = Object.keys(packageJson.scripts || {})
      .filter(script => !['build', 'preview', 'test', 'lint', 'format'].includes(script))
      .map(script => script.toUpperCase())

    const allModes = [...new Set([...scriptModes, ...customModes.map(m => m.toUpperCase())])]
    
    if (includeAll) {
      allModes.push('ALL')
    }

    log(`[vite-mode-logging] Found modes: ${allModes.join(', ')}`)

    // 2. Create viteLogging.config.ts
    createViteLoggingConfig(projectRoot)
    log('[vite-mode-logging] Created viteLogging.config.ts')

    // 3. Update vite.config.ts
    updateViteConfig(projectRoot)
    log('[vite-mode-logging] Updated vite.config.ts')

    // 4. Create src/debug.ts
    createDebugFile(projectRoot, allModes)
    log('[vite-mode-logging] Created src/debug.ts')

    // 5. Update main entry file to import debug
    updateMainFile(projectRoot)
    log('[vite-mode-logging] Updated main entry file')

    console.log('✅ [vite-mode-logging] Setup complete!')
    console.log('')
    console.log('Usage:')
    allModes.forEach(mode => {
      if (mode !== 'ALL') {
        console.log(`  ${mode}("Your message here");`)
      }
    })
    if (includeAll) {
      console.log(`  ALL("Message that always appears");`)
    }
    console.log('')
    console.log('Run your scripts normally:')
    Object.keys(packageJson.scripts || {}).forEach(script => {
      console.log(`  npm run ${script}`)
    })

  } catch (error) {
    console.error('[vite-mode-logging] Setup failed:', error)
    process.exit(1)
  }
}

function createViteLoggingConfig(projectRoot: string) {
  const configPath = path.join(projectRoot, 'viteLogging.config.ts')
  
  if (fs.existsSync(configPath)) {
    console.log('[vite-mode-logging] viteLogging.config.ts already exists, skipping...')
    return
  }

  const template = `import type { Plugin } from 'vite'
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
    content = \`// Mode-based logging helper functions that will be transformed by the build process
// These functions are declared globally and can be used anywhere without imports

declare global {
  function ALL(message: string): void;
}

// Make the functions available at runtime (though they'll be transformed)
(globalThis as any).ALL = function(_message: string) { /* no-op */ };

export {}; // Make this a module
\`
  }

  // Convert mode to uppercase for the function name
  const functionName = mode.toUpperCase()
  
  // Check if global declaration already exists
  const globalDeclRegex = new RegExp(\`function\\\\s+\${functionName}\\\\s*\\\\(\`, 'i')
  if (!globalDeclRegex.test(content)) {
    // Find the declare global block and add the function
    const globalBlockRegex = /(declare global \\{[^}]*)(})/s
    if (globalBlockRegex.test(content)) {
      content = content.replace(globalBlockRegex, \`$1  function \${functionName}(message: string): void;\\n$2\`)
    } else {
      // Add new global block
      const newGlobalBlock = \`
declare global {
  function \${functionName}(message: string): void;
}
\`
      content = newGlobalBlock + content
    }
    
    // Also add runtime implementation
    const runtimeImpl = \`(globalThis as any).\${functionName} = function(_message: string) { /* no-op */ };\\n\`
    const exportIndex = content.lastIndexOf('export {};')
    if (exportIndex !== -1) {
      content = content.slice(0, exportIndex) + runtimeImpl + content.slice(exportIndex)
    } else {
      content += runtimeImpl + '\\nexport {};\\n'
    }
    
    fs.writeFileSync(debugFilePath, content, 'utf-8')
    console.log(\`Added \${functionName} global function to debug.ts\`)
  }

  // Always ensure ALL function exists in global declarations
  const allGlobalRegex = /function\\s+ALL\\s*\\(/i
  if (!allGlobalRegex.test(content)) {
    content = fs.readFileSync(debugFilePath, 'utf-8')
    const globalBlockRegex = /(declare global \\{[^}]*)(})/s
    if (globalBlockRegex.test(content)) {
      content = content.replace(globalBlockRegex, \`$1  function ALL(message: string): void;\\n$2\`)
    }
    
    const runtimeImpl = \`(globalThis as any).ALL = function(_message: string) { /* no-op */ };\\n\`
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
 */
export function modeBasedLoggingPlugin(mode: string): Plugin {
  // Ensure the mode function exists in debug.ts
  ensureModeFunction(mode)
  
  return {
    name: 'mode-based-logging',
    enforce: 'pre',
    transform(code: string, id: string) {
      // Only process .ts, .tsx, .js, .jsx files
      if (!/\\.(tsx?|jsx?)$/.test(id)) return
      
      // Skip the debug.ts file itself to avoid circular transformations
      if (id.includes('debug.ts')) return

      // Convert mode to uppercase for matching
      const currentModeUpper = mode.toUpperCase()
      
      // Create regex to match any mode-based logging call
      const allModesRegex = /\\b([A-Z][A-Z0-9_]*)\\s*\\(((?:[^)(]|\\([^)]*\\))*)\\)/g

      const transformed = code.replace(allModesRegex, (_, modeName, args) => {
        // ALL function always gets transformed
        if (modeName === 'ALL') {
          return \`console.log(\${args})\`
        }
        
        // Check if this logging call matches the current mode
        if (modeName === currentModeUpper) {
          // Transform to console.log for matching mode
          return \`console.log(\${args})\`
        } else {
          // Remove logging calls for non-matching modes
          return ''
        }
      })

      if (transformed !== code) {
        return {
          code: transformed,
          map: null
        }
      }
    }
  }
}`

  fs.writeFileSync(configPath, template)
}

function updateViteConfig(projectRoot: string) {
  const viteConfigPath = path.join(projectRoot, 'vite.config.ts')
  
  if (!fs.existsSync(viteConfigPath)) {
    console.warn('[vite-mode-logging] vite.config.ts not found, you may need to add the plugin manually')
    return
  }

  let content = fs.readFileSync(viteConfigPath, 'utf-8')
  
  // Check if already configured
  if (content.includes('modeBasedLoggingPlugin')) {
    console.log('[vite-mode-logging] vite.config.ts already configured, skipping...')
    return
  }

  // Add import
  if (!content.includes('modeBasedLoggingPlugin')) {
    const importLine = "import { modeBasedLoggingPlugin } from './viteLogging.config'"
    
    // Find where to insert the import
    const lastImportMatch = content.match(/^import.*$/gm)
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1]
      content = content.replace(lastImport, lastImport + '\n' + importLine)
    } else {
      content = importLine + '\n' + content
    }
  }

  // Update the config to use the plugin
  const pluginRegex = /plugins:\\s*\\[(.*?)\\]/s
  if (pluginRegex.test(content)) {
    content = content.replace(pluginRegex, (_, plugins) => {
      const trimmedPlugins = plugins.trim()
      const newPlugin = 'modeBasedLoggingPlugin(mode)'
      
      if (trimmedPlugins === '') {
        return `plugins: [
      ${newPlugin}
    ]`
      } else {
        return `plugins: [
      ${newPlugin},
      ${trimmedPlugins}
    ]`
      }
    })
  }

  // Update config function to accept mode parameter
  if (!content.includes('({ mode, command })') && !content.includes('({ mode })')) {
    content = content.replace('defineConfig(', 'defineConfig(({ mode, command }) => ')
    content = content.replace(/}\)$/, '})')
    
    // Add esbuild configuration
    const esbuildConfig = `
  esbuild: {
    // Only remove console logs in production builds
    drop: command === 'build' && mode === 'production' ? ['console'] : [],
    dropLabels: command === 'build' && mode === 'production' ? ['DEBUG'] : []
  }`
    
    // Add esbuild config before closing brace
    content = content.replace(/}\)$/, esbuildConfig + '\n})')
  }

  fs.writeFileSync(viteConfigPath, content)
}

function createDebugFile(projectRoot: string, modes: string[]) {
  const debugPath = path.join(projectRoot, 'src', 'debug.ts')
  
  // Create src directory if it doesn't exist
  const srcDir = path.dirname(debugPath)
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true })
  }

  if (fs.existsSync(debugPath)) {
    console.log('[vite-mode-logging] src/debug.ts already exists, skipping...')
    return
  }

  const globalDeclarations = modes.map(mode => 
    `  function ${mode}(message: string): void;`
  ).join('\n')

  const runtimeImplementations = modes.map(mode => 
    `(globalThis as any).${mode} = function(_message: string) { /* no-op */ };`
  ).join('\n')

  const content = `// Mode-based logging helper functions that will be transformed by the build process
// These functions are declared globally and can be used anywhere without imports

declare global {
${globalDeclarations}
}

// Make the functions available at runtime (though they'll be transformed)
${runtimeImplementations}

export {}; // Make this a module
`

  fs.writeFileSync(debugPath, content)
}

function updateMainFile(projectRoot: string) {
  // Try to find main entry file
  const possibleMainFiles = [
    'src/main.tsx',
    'src/main.ts',
    'src/index.tsx',
    'src/index.ts',
    'src/App.tsx',
    'src/App.ts'
  ]

  let mainFilePath: string | null = null
  for (const file of possibleMainFiles) {
    const fullPath = path.join(projectRoot, file)
    if (fs.existsSync(fullPath)) {
      mainFilePath = fullPath
      break
    }
  }

  if (!mainFilePath) {
    console.warn('[vite-mode-logging] Could not find main entry file, you may need to add "import \'./debug\'" manually')
    return
  }

  let content = fs.readFileSync(mainFilePath, 'utf-8')
  
  // Check if already imported
  if (content.includes("import './debug'") || content.includes('import "./debug"')) {
    console.log('[vite-mode-logging] debug.ts already imported in main file, skipping...')
    return
  }

  // Add import after other imports
  const lines = content.split('\n')
  let insertIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i + 1
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      insertIndex = i
      break
    } else if (!lines[i].trim().startsWith('import ') && insertIndex > 0) {
      break
    }
  }

  lines.splice(insertIndex, 0, "import './debug' // Load global logging functions")
  content = lines.join('\n')

  fs.writeFileSync(mainFilePath, content)
}