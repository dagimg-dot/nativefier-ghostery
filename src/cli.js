#!/usr/bin/env node

import { Command } from "commander";
import { build as buildApp } from "./index.js";

/**
 * Converts kebab-case to camelCase.
 * e.g., "electron-version" -> "electronVersion"
 * @param {string} str Input kebab-case string.
 * @returns {string} camelCase string.
 */
function kebabToCamel(str) {
	return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Parses an array of unknown command-line arguments into an object.
 * Assumes flags start with '--'. Flags without a subsequent non-flag value
 * are treated as boolean true.
 * @param {string[]} args Array of unknown arguments from Commander.
 * @returns {object} An object representing the parsed arguments.
 */
function parseUnknownArgs(args) {
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const key = kebabToCamel(arg.substring(2));
			if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
				options[key] = args[i + 1];
				i++;
			} else {
				options[key] = true;
			}
		}
	}
	return options;
}

const program = new Command();
program
	.name("nativefier-ghostery")
	.description("Build a Nativefier app with Ghostery adblocker injected")
	.argument("<target-url>", "URL to package as an Electron app")
	.option("-n, --name <appName>", "Name of the application", "WebApp")
	.option(
		"-o, --out <dir>",
		"Output directory where app is built",
		"./built-app",
	)
	.option("--electron-version <ver>", "Electron version to use")
	.allowUnknownOption(true)
	.allowExcessArguments(true)
	.parse(process.argv);

const targetUrl = program.args[0];
const options = program.opts();

// Collect any unknown arguments to pass directly to Nativefier
const unknownArgs = program.parseOptions(process.argv).unknown;

(async () => {
	try {
		console.log("[CLI] Starting build...");

		// Parse the unknown arguments into an object
		const parsedUnknownOptions = parseUnknownArgs(unknownArgs);
		console.log("[CLI Debug] Parsed unknown options:", parsedUnknownOptions);

		// Construct the single options object expected by builder.js
		const optionsForBuilder = {
			targetUrl: targetUrl,
			appName: options.name,
			outputDir: options.out,
			nativefierOverrides: {
				// Pass electron-version if provided explicitly
				...(options.electronVersion && {
					"electron-version": options.electronVersion,
				}),
				...parsedUnknownOptions,
			},
		};

		console.log("[CLI Debug] Final options for builder:", optionsForBuilder);

		await buildApp(optionsForBuilder);

		console.log("[CLI] Build finished successfully.");
	} catch (err) {
		console.error("[CLI] Build failed:", err);
		process.exit(1);
	}
})();
