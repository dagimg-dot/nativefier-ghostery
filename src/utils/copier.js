import path from "node:path";
import fs from "fs-extra";

/**
 * List of modules that need to be copied to the built app
 */
const MODULES_TO_COPY = [
	"@ghostery", // Copy the whole scope
	"cross-fetch",
	"tldts-experimental",
	"@remusao",
	"node-fetch",
	"whatwg-url",
	"webidl-conversions",
	"tr46",
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

	const sourceNodeModules = path.join(currentDir, "..", "node_modules");
	const destNodeModules = path.join(
		appPath,
		"resources",
		"app",
		"node_modules",
	);

	console.log(`[Copy Debug] Source node_modules path: ${sourceNodeModules}`);
	console.log(`[Copy Debug] Destination node_modules path: ${destNodeModules}`);

	try {
		await fs.ensureDir(destNodeModules);

		for (const moduleName of MODULES_TO_COPY) {
			const sourcePath = path.join(sourceNodeModules, moduleName);
			const destPath = path.join(destNodeModules, moduleName);

			if (moduleName.includes("ghostery")) {
				console.log(`[Copy Debug @ghostery] Source Path: ${sourcePath}`);
				console.log(`[Copy Debug @ghostery] Dest Path: ${destPath}`);
				const exists = await fs.pathExists(sourcePath);
				console.log(`[Copy Debug @ghostery] Source exists? ${exists}`);
			}

			if (await fs.pathExists(sourcePath)) {
				console.log(`[Copy] Copying ${moduleName}...`);
				await fs.copy(sourcePath, destPath, { overwrite: true });
			} else {
				console.warn(
					`[Copy] Warning: Module ${moduleName} not found in ${sourceNodeModules}. Skipping copy.`,
				);
			}
		}

		console.log("[Copy] Finished copying node_modules.");
	} catch (copyError) {
		console.error("[Copy] Error copying node_modules:", copyError);
		throw copyError;
	}
}
