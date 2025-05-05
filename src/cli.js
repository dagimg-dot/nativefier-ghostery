#!/usr/bin/env node

import { Command } from 'commander';
import buildApp from './index.js';

const program = new Command();
program
  .name('nativefier-ghostery')
  .description('Build a Nativefier app with Ghostery adblocker injected')
  .argument('<target-url>', 'URL to package as an Electron app')
  .option('-n, --name <appName>', 'Name of the application', 'WebApp')
  .option('-o, --out <dir>', 'Output directory where app is built', './built-app')
  .option('--electron-version <ver>', 'Electron version to use')
  .allowUnknownOption(true) // allow additional Nativefier options
  .allowExcessArguments(true)
  .parse(process.argv);

const targetUrl = program.args[0];
const options = program.opts();

// Collect any unknown arguments to pass directly to Nativefier
const unknownArgs = program.parseOptions(process.argv).unknown;

(async () => {
  try {
    console.log('[CLI] Starting build...');
    await buildApp(targetUrl, {
      name: options.name,
      out: options.out,
      'electron-version': options.electronVersion,
      nativefierArgs: unknownArgs
    });
    console.log('[CLI] Build finished successfully.');
  } catch (err) {
    console.error('[CLI] Build failed:', err);
    process.exit(1);
  }
})(); 