import path from "node:path";
import fs from "fs-extra";

async function findMainJsPath(appPath) {
	const possiblePaths = [
		path.join(appPath, "resources", "app", "lib", "main.js"),
		path.join(appPath, "resources", "app", "main.js"),
	];
	for (const p of possiblePaths) {
		if (await fs.pathExists(p)) {
			console.log(`[Inject] Found main process file at: ${p}`);
			return p;
		}
	}
	throw new Error(
		`[Inject] Could not find main.js in expected locations within ${appPath}/resources/app/`,
	);
}

/**
 * Injects Ghostery adblocker and window control code into the built Nativefier app.
 * @param {string} appPath - Path to the root of the built Electron application.
 * @param {string} currentDir - The directory path of the calling script (used for cache path).
 * @returns {Promise<void>} Resolves when injection is complete, rejects on error.
 */
export async function injectCode(appPath, currentDir) {
	console.log(`[Inject] Starting code injection for app at: ${appPath}`);

	try {
		const mainJsPath = await findMainJsPath(appPath);
		console.log(
			`[Inject Debug] Found main JS file to inject into: ${mainJsPath}`,
		);

		let mainJsContent = await fs.readFile(mainJsPath, "utf-8");

		const engineCachePath = path.join(currentDir, "ghostery-engine.bin");

		// Note: This code runs INSIDE the Electron main process (uses require)
		// Paths inside require() need to be relative to the app's node_modules
		const injectionCode = `
// --- Ghostery Adblocker Injection START ---
// Requires are moved to the top of the file (ghosteryFetch, ghosteryFs, ghosteryPath, GhosteryElectronBlocker, ghosteryFullLists)
console.log('[Ghostery] Initializing blocker...');
GhosteryElectronBlocker.fromLists( // Use aliased name from require statement added at top
  ghosteryFetch, // Use aliased name
  ghosteryFullLists, // Use aliased name
  { enableCompression: true },
  { // Persist engine cache to disk
    path: ${JSON.stringify(engineCachePath)}, // Absolute path injected from builder
    read: ghosteryFs.promises.readFile, // Use aliased name
    write: ghosteryFs.promises.writeFile, // Use aliased name
  }
).then((blocker) => {
  console.log('[Ghostery] Blocker initialized. Attaching to session...');
  // IMPORTANT: Assumes 'mainWindow' is the variable name used by Nativefier for the main Browserwindow
  // This might break if Nativefier changes its internal variable names.
  if (typeof mainWindow !== 'undefined' && mainWindow && mainWindow.webContents && mainWindow.webContents.session) {
    blocker.enableBlockingInSession(mainWindow.webContents.session);
    console.log('[Ghostery] Blocker attached to session.');

    // Optional: Add event listeners from blocker
    blocker.on('request-blocked', (request) => {
      console.log('[Ghostery] blocked', request.tabId, request.url.substring(0, 80)); // Log truncated URL
    });
     blocker.on('request-redirected', (request) => {
       console.log('[Ghostery] redirected', request.tabId, request.url.substring(0, 80));
     });
    // blocker.on('script-injected', (script, url) => { console.log('[Ghostery] script injected', url); });
    // blocker.on('style-injected', (style, url) => { console.log('[Ghostery] style injected', url); });

  } else {
    // Add a delay and retry check in case mainWindow is not immediately available
    setTimeout(() => {
        if (typeof mainWindow !== 'undefined' && mainWindow && mainWindow.webContents && mainWindow.webContents.session) {
             blocker.enableBlockingInSession(mainWindow.webContents.session);
             console.log('[Ghostery] Blocker attached to session after delay.');
        } else {
            console.error('[Ghostery] Could not attach blocker: mainWindow or session not found even after delay.');
        }
    }, 1500); // Retry after 1.5 seconds
  }
}).catch((err) => {
  console.error('[Ghostery] Error initializing blocker:', err);
});
// --- Ghostery Adblocker Injection END ---
`;

		// --- Add code to prevent external windows --- //
		const windowControlCode = `
// --- Prevent External Windows START ---
// IMPORTANT: Also assumes 'mainWindow' is the variable name.
if (typeof mainWindow !== 'undefined' && mainWindow && mainWindow.webContents) {
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log(\`[Window Control] Denying new window/external navigation for: \${url.substring(0, 100)}...\`);
    // To load in the same window instead:
    // if (mainWindow && mainWindow.loadURL) { mainWindow.loadURL(url); }
    return { action: 'deny' }; // Block the new window
  });
  console.log('[Window Control] New window handler set to deny external opening.');
} else {
    // Add a delay and retry check
    setTimeout(() => {
        if (typeof mainWindow !== 'undefined' && mainWindow && mainWindow.webContents) {
            mainWindow.webContents.setWindowOpenHandler(({ url }) => {
                console.log(\`[Window Control] Denying new window/external navigation for: \${url.substring(0, 100)}...\`);
                return { action: 'deny' };
            });
            console.log('[Window Control] New window handler set after delay.');
        } else {
             console.error('[Window Control] Could not set window handler: mainWindow or webContents not found even after delay.');
        }
    }, 1500); // Retry after 1.5 seconds
}
// --- Prevent External Windows END ---
`;

		// Inject before the first `mainWindow.loadURL` or fallback to before `mainWindow.on('closed'`
		const loadUrlMarker = "mainWindow.loadURL";
		const injectionPoint = mainJsContent.indexOf(loadUrlMarker);
		let injected = false;

		if (injectionPoint !== -1) {
			mainJsContent = `${
				mainJsContent.slice(0, injectionPoint) + injectionCode
			}\n\n${windowControlCode}\n\n${mainJsContent.slice(injectionPoint)}`;
			console.log(
				`[Inject] Injected Ghostery and Window Control code before '${loadUrlMarker}'.`,
			);
			injected = true;
		} else {
			console.warn(
				`[Inject] Could not find injection marker '${loadUrlMarker}' in ${mainJsPath}. Trying fallback marker.`,
			);
			const fallbackMarker = "mainWindow.on('closed'";
			const fallbackInjectionPoint = mainJsContent.lastIndexOf(fallbackMarker);
			if (fallbackInjectionPoint !== -1) {
				mainJsContent = `${
					mainJsContent.slice(0, fallbackInjectionPoint) + injectionCode
				}\n\n${windowControlCode}\n\n${mainJsContent.slice(fallbackInjectionPoint)}`;
				console.log(
					"[Inject] Injected Ghostery and Window Control code using fallback marker.",
				);
				injected = true;
			} else {
				console.error(
					`[Inject] Could not find primary ('${loadUrlMarker}') or fallback ('${fallbackMarker}') injection points in ${mainJsPath}. Injection failed.`,
				);
				throw new Error(
					`Could not find a suitable injection point in ${mainJsPath}.`,
				);
			}
		}

		if (injected) {
			const requireStatements = `\
// --- Ghostery Dependencies START ---
const { ElectronBlocker: GhosteryElectronBlocker, fullLists: ghosteryFullLists } = require('../node_modules/@ghostery/adblocker-electron');
const ghosteryFetch = require('../node_modules/cross-fetch');
const ghosteryFs = require('node:fs'); // Use built-in fs
const ghosteryPath = require('node:path'); // Use built-in path
// --- Ghostery Dependencies END ---

`;
			console.log(
				`[Inject Debug] Injecting require statements:\n${requireStatements}`,
			);
			mainJsContent = requireStatements + mainJsContent;
			console.log(
				"[Inject] Added require statements for Ghostery dependencies at the top.",
			);

			await fs.writeFile(mainJsPath, mainJsContent, "utf-8");
			console.log(
				`[Inject] Successfully modified ${mainJsPath} with adblocker and window control code.`,
			);
		}

		console.log("[Inject] Code injection step finished.");
	} catch (error) {
		console.error("[Inject] CRITICAL: Code injection process failed.");
		console.error("[Inject] Error details:", error);
		throw error;
	}
}
