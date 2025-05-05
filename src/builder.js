import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildNativefierApp } from "nativefier";
import { copyRequiredModules } from "./utils/copier.js";
import { injectCode } from "./utils/injector.js";

const DEFAULT_NATIVEFIER_OPTIONS = {
	overwrite: true,
	"electron-version": "35.2.2",
	browserwindowOptions: {
		webPreferences: {
			contextIsolation: false,
			nodeIntegration: false,
		},
	},
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
		icon,
	} = options;

	console.log(`[Build] Starting build for ${targetUrl} - App Name: ${appName}`);

	if (!targetUrl || !appName || !outputDir) {
		throw new Error(
			"[Build] Critical: targetUrl, appName, and outputDir are required options.",
		);
	}

	// Combine default options with user-provided overrides
	const nativefierOptions = {
		...DEFAULT_NATIVEFIER_OPTIONS,
		name: appName,
		targetUrl: targetUrl,
		out: outputDir,
		...nativefierOverrides,
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
		console.log("[Build] Calling Nativefier...");
		const appPath = await buildNativefierApp(nativefierOptions);
		console.log(`[Build] Nativefier finished. App path: ${appPath}`);

		const currentDir = path.dirname(fileURLToPath(import.meta.url));
		console.log(`[Build] Determined current script directory: ${currentDir}`);

		console.log("[Build] Initiating code injection...");
		await injectCode(appPath, currentDir);
		console.log("[Build] Code injection step completed.");

		console.log("[Build] Initiating module copy...");
		await copyRequiredModules(currentDir, appPath);
		console.log("[Build] Module copy step completed.");

		console.log(
			`[Build] Build process completed successfully for ${appName}! App located at: ${appPath}`,
		);
		return appPath;
	} catch (error) {
		console.error("[Build] CRITICAL: Build process failed.");
		console.error("[Build] Error details:", error);
		throw error;
	}
}

export { build };
