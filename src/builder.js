import { buildNativefierApp } from "nativefier";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { injectCode } from "./utils/injector.js"; // Import injector
import { copyRequiredModules } from "./utils/copier.js"; // Import copier

// Default options can be defined here or in a separate config file
const DEFAULT_NATIVEFIER_OPTIONS = {
  overwrite: true,
  "electron-version": "35.2.2", // Consider making this configurable
  browserwindowOptions: {
    webPreferences: {
      contextIsolation: false, // Keep note of security implications
      nodeIntegration: false,
    },
  },
  // Add other default Nativefier options if needed
};

/**
 * Main build function to create the Nativefier app, inject code, and copy modules.
 * @param {object} options - Configuration options for the build.
 * @param {string} options.targetUrl - The URL to package.
 * @param {string} options.appName - The name for the application.
 * @param {string} options.outputDir - The directory to build the app in.
 * @param {object} [options.nativefierOverrides={}] - Optional overrides for Nativefier options.
 * @param {string} [options.icon] - Optional path to an icon file.
 * @returns {Promise<string>} Path to the built application.
 * @throws {Error} If any step of the build process fails.
 */
async function build(options) {
  const { 
    targetUrl, 
    appName, 
    outputDir, 
    nativefierOverrides = {}, 
    icon 
  } = options;

  console.log(`[Build] Starting build for ${targetUrl} - App Name: ${appName}`);

  if (!targetUrl || !appName || !outputDir) {
    throw new Error("[Build] Critical: targetUrl, appName, and outputDir are required options.");
  }

  // Combine default options with user-provided overrides
  const nativefierOptions = {
    ...DEFAULT_NATIVEFIER_OPTIONS,
    name: appName,
    targetUrl: targetUrl,
    out: outputDir,
    ...nativefierOverrides, // Apply overrides
    // Ensure browserwindowOptions are merged correctly if provided in overrides
    browserwindowOptions: {
        ...DEFAULT_NATIVEFIER_OPTIONS.browserwindowOptions,
        ...(nativefierOverrides.browserwindowOptions || {}),
        webPreferences: {
            ...DEFAULT_NATIVEFIER_OPTIONS.browserwindowOptions?.webPreferences,
            ...(nativefierOverrides.browserwindowOptions?.webPreferences || {}),
        },
    },
  };

  if (icon) {
    nativefierOptions.icon = icon;
    console.log(`[Build] Using icon: ${icon}`);
  }

  console.log("[Build] Final Nativefier options:", nativefierOptions);

  try {
    // 1. Build the basic Nativefier app
    console.log("[Build] Calling Nativefier...");
    const appPath = await buildNativefierApp(nativefierOptions);
    console.log(`[Build] Nativefier finished. App path: ${appPath}`);

    // Determine the directory of the current module (builder.js)
    // Needed for relative paths to cache files and node_modules
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    console.log(`[Build] Determined current script directory: ${currentDir}`);

    // 2. Inject Ghostery and window control code
    console.log("[Build] Initiating code injection...");
    await injectCode(appPath, currentDir); // Call the injector utility
    console.log("[Build] Code injection step completed.");

    // 3. Copy required node_modules
    console.log("[Build] Initiating module copy...");
    await copyRequiredModules(currentDir, appPath); // Call the copier utility
    console.log("[Build] Module copy step completed.");

    console.log(`[Build] Build process completed successfully for ${appName}! App located at: ${appPath}`);
    return appPath; // Return the path to the built app

  } catch (error) {
    console.error("[Build] CRITICAL: Build process failed.");
    // Log the specific error that occurred during build/inject/copy
    console.error("[Build] Error details:", error);
    // Re-throw the error so the caller (e.g., CLI) knows it failed
    throw error; 
  }
}

export { build };
