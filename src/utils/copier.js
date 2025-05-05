import fs from 'fs-extra';
import path from 'node:path';

/**
 * List of modules that need to be copied to the built app
 */
const MODULES_TO_COPY = [
  '@ghostery', // Copy the whole scope
  'cross-fetch',
  'tldts-experimental',
  '@remusao',
  'node-fetch',
  'whatwg-url',
  'webidl-conversions',
  'tr46',
  // Add any other direct dependencies of the injection code if needed
  // fs-extra will copy their sub-dependencies automatically
];

/**
 * Copies required node_modules to the built app directory.
 * Ensures the destination directory exists and copies modules specified in MODULES_TO_COPY.
 * @param {string} currentDir - The directory path of the script calling this function (used to find source node_modules).
 * @param {string} appPath - The path where the Nativefier app was built (root of the built app).
 * @returns {Promise<void>} A promise that resolves when copying is complete or rejects on error.
 * @throws {Error} Throws an error if copying fails.
 */
export async function copyRequiredModules(currentDir, appPath) {
  console.log("[Copy] Copying required node_modules to app...");

  const sourceNodeModules = path.join(currentDir, "node_modules");
  // Destination needs to be inside the unpacked application resources
  const destNodeModules = path.join(appPath, "resources", "app", "node_modules");

  try {
    await fs.ensureDir(destNodeModules); // Ensure the target directory exists

    for (const moduleName of MODULES_TO_COPY) {
      const sourcePath = path.join(sourceNodeModules, moduleName);
      const destPath = path.join(destNodeModules, moduleName);

      if (await fs.pathExists(sourcePath)) {
        // Check if module exists in source before attempting copy
        console.log(`[Copy] Copying ${moduleName}...`);
        await fs.copy(sourcePath, destPath, { overwrite: true });
      } else {
        // Log a warning if a module listed isn't found in the source.
        // This might happen if dependencies change or 'npm install' wasn't run correctly.
        console.warn(
          `[Copy] Warning: Module ${moduleName} not found in ${sourceNodeModules}. Skipping copy.`
        );
      }
    }

    console.log("[Copy] Finished copying node_modules.");
  } catch (copyError) {
    // Log the specific error encountered during the copy process.
    console.error("[Copy] Error copying node_modules:", copyError);
    // Re-throw the error to ensure the build process knows it failed.
    throw copyError;
  }
}
