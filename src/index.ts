#!/usr/bin/env bun

import { resolve } from "node:path";
import { loadEnv } from "./utils";
import { upload } from "./upload";

function usage(): never {
  console.error("Usage: bun src/index.ts upload <working_directory> <csv_file> <account> [--auto-token]");
  process.exit(1);
}

async function main() {
  const [command, ...args] = Bun.argv.slice(2);

  if (command !== "upload") usage();

  const [workingDirectoryArg, csvFileArg, account, option] = args;
  if (!workingDirectoryArg || !csvFileArg || !account || (option && option !== "--auto-token")) usage();

  const callerDirectory = process.cwd();
  const workingDirectory = resolve(callerDirectory, workingDirectoryArg);
  const csvFile = resolve(callerDirectory, csvFileArg);

  await loadEnv(callerDirectory);
  const autoToken = option === "--auto-token";

  await upload(workingDirectory, csvFile, account, autoToken);
}

try {
  await main();
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}